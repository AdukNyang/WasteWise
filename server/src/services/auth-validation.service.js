const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateName = (name) => {
  if (typeof name !== "string" || name.trim().length < 2)
    return "Full name must contain at least 2 characters";
  if (name.trim().length > 100)
    return "Full name must contain no more than 100 characters";
  return null;
};

const validateEmail = (email) => {
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim()))
    return "A valid email address is required";
  if (email.trim().length > 254)
    return "Email address must contain no more than 254 characters";
  return null;
};

const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8)
    return "Password must contain at least 8 characters";
  if (password.length > 128)
    return "Password must contain no more than 128 characters";
  return null;
};

const validatePhone = (phone) => {
  if (phone === undefined || phone === null || phone === "")
    return null;
  if (typeof phone !== "string")
    return "Phone number must be text";
  if (!/^[+\d][\d\s()-]{5,24}$/.test(phone.trim()))
    return "A valid phone number is required";
  return null;
};

const validateRegistration = (body = {}) => {
  const checks = [
    validateName(body.name),
    validateEmail(body.email),
    validatePassword(body.password),
    validatePhone(body.phone),
  ];
  return checks.find((error) => error !== null) || null;
};

const validateLogin = (body = {}) => {
  const emailError = validateEmail(body.email);
  if (emailError) return emailError;
  if (typeof body.password !== "string" || body.password.length === 0)
    return "Password is required";
  return null;
};

module.exports = {
  validateRegistration,
  validateLogin,
};
