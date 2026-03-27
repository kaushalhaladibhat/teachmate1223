// Admin emails - hardcoded for now
const ADMIN_EMAILS = ["kaushalllsharma24@gmail.com"];

export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
