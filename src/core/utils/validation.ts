const MAX_64BIT_INT = BigInt('9223372036854775807');

const validation = {
  isValidName: (name: string) => {
    return /^[A-Za-zÄÖÜäöüß\s-]{2,}$/.test(name.trim()) || name.length === 0;
  },

  isValidPhone: (phone: string) => {
    return /^\+?[0-9\s\-()]{5,20}$/.test(phone) || phone.length === 0;
  },

  isValidEmail: (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length === 0;
  },

  isValidStreet: (street: string) => {
    return /^[A-Za-zÄÖÜäöüß\s\-.]{2,}$/.test(street.trim()) || street.length === 0;
  },

  isValidHouseNumber: (houseNumber: string) => {
    return /^[0-9]+[a-zA-Z\-/]?$/.test(houseNumber.trim()) || houseNumber.length === 0;
  },

  isValidCity: (city: string) => {
    return /^[A-Za-zÄÖÜäöüß\s-]{2,}$/.test(city.trim()) || city.length === 0;
  },

  isValidZip: (zip: string) => {
    return /^\d{4,5}$/.test(zip.trim()) || zip.length === 0;
  },

  isValidPseudonym: (pseudonym: string) => {
    return /^[A-Za-z0-9_-]+$/.test(pseudonym.trim()) || pseudonym.length === 0;
  },

  isValidRegistrationName: (name: string) => {
    return /^[A-Za-zÄÖÜäöüß\s\-.]{2,}$/.test(name.trim());
  },

  isValidRegistrationEmail: (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  },

  isValidRegistrationPhone: (phone: string) => {
    return /^\+?[0-9\s\-()]{5,20}$/.test(phone);
  },

  isValidRegistrationStreet: (street: string) => {
    return /^[A-Za-zÄÖÜäöüß\s\-.]{2,}$/.test(street.trim());
  },

  isValidRegistrationHouseNumber: (houseNumber: string) => {
    return /^[0-9]+[a-zA-Z\-/]?$/.test(houseNumber.trim());
  },

  isValidRegistrationCity: (city: string) => {
    return /^[A-Za-zÄÖÜäöüß\s-]{2,}$/.test(city.trim());
  },

  isValidRegistrationZip: (zip: string) => {
    return /^\d{4,5}$/.test(zip.trim());
  },

  isValidLocation: (location: string) => {
    return /^[A-Za-z0-9ÄÖÜäöüß\s\-.]{2,}$/.test(location.trim()) || location.length === 0;
  },

  isValidRegistrationLocation: (location: string) => {
    return /^[A-Za-z0-9ÄÖÜäöüß\s\-.]{2,}$/.test(location.trim());
  },

  isValidRegistrationGroupName: (groupName: string) => {
    return /^[A-Za-z0-9ÄÖÜäöüß\s\-.]{5,}$/.test(groupName.trim());
  },

  isValidRegistrationPrefix: (prefix: string) => {
    return /^[A-Za-z0-9ÄÖÜäöüß\s\-.]{2,}$/.test(prefix.trim());
  },

  isValidRegistrationDescription: (description: string) => {
    return /^[A-Za-z0-9ÄÖÜäöüß\s\-.]{10,}$/.test(description.trim());
  },

  isValidRegistrationMaxNumPsn: (maxNumPsn: string) => {
    try {
      const value = BigInt(maxNumPsn.trim());
      return value >= 0n && value <= MAX_64BIT_INT;
    } catch {
      return false;
    }
  }
};

export default validation;
