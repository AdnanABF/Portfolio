const PRODUCTION_URL = "https://adnanbinfarook.com";

/**
 * The public address of this deployment (NEXT_PUBLIC_SITE_URL, set when the site is built). Without it the site assumes
 * it is the real one.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_URL).replace(/\/$/, "");

/** Only the real website is meant for search engines; staging and any other address is kept out of their results. */
export const IS_PRODUCTION_SITE = SITE_URL === PRODUCTION_URL;

export const SITE_NAME = "Adnan Bin Farook";
export const SITE_ROLE = "Software Engineer";
export const SITE_EMAIL = "adnanabf@gmail.com";
export const SITE_LOCATION = "Malappuram, Kerala, India - 679574";

export const SOCIALS = {
  github: "https://github.com/AdnanABF",
  linkedin: "https://www.linkedin.com/in/adnan-here/",
  email: `mailto:${SITE_EMAIL}`,
} as const;

export const SITE_TITLE =
  "Adnan Bin Farook | Software Engineer - .NET, C#, MSSQL, Azure, React, NestJS, MongoDB";

export const SITE_DESCRIPTION =
  "Portfolio of Adnan Bin Farook, a Software Engineer specializing in modernizing legacy systems and building scalable full-stack applications with .NET, React, and NestJS.";
