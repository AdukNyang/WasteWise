const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COIN_COSTS = {
  DIGITAL_CERTIFICATE: 1000,
  LETTER_OF_RECOGNITION: 2000,
  DATA_BUNDLE: 2000,
  PARTNER_DISCOUNT: 1500,
  AIRTIME: 3000,
  FELLOWSHIP_ACCESS: 5000,
  COMMUNITY_CHAMPION: 10000,
};

const getWallet = async (req, res) => {
  try {
    const account = await prisma.ecoCoinsAccount.findUnique({
      where: { userId: req.user.id },
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
        redemptions: { orderBy: { redeemedAt: "desc" } },
      },
    });

    if (!account) return res.status(404).json({ message: "EcoCoins account not found" });

    res.json(account);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const redeemCoins = async (req, res) => {
  const { rewardType } = req.body;

  if (!COIN_COSTS[rewardType])
    return res.status(400).json({ message: "Invalid reward type", validTypes: Object.keys(COIN_COSTS) });

  const cost = COIN_COSTS[rewardType];

  try {
    const account = await prisma.ecoCoinsAccount.findUnique({ where: { userId: req.user.id } });

    if (!account) return res.status(404).json({ message: "EcoCoins account not found" });
    if (account.balance < cost)
      return res.status(400).json({ message: `Not enough coins. Need ${cost}, have ${account.balance}` });

    await prisma.$transaction([
      prisma.ecoCoinsAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: cost } },
      }),
      prisma.redemption.create({
        data: { ecoCoinsAccountId: account.id, rewardType, coinsSpent: cost },
      }),
      prisma.ecoCoinsTransaction.create({
        data: { ecoCoinsAccountId: account.id, amount: -cost, reason: `Redeemed ${rewardType}` },
      }),
    ]);

    res.json({ message: `Successfully redeemed ${rewardType} for ${cost} coins (simulated)` });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getWallet, redeemCoins };
