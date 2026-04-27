import { Helmet } from "react-helmet-async";

const SEO = ({ title, description, canonical, ogImage }) => {
  const defaultTitle = "Chirala Allround Services";
  const defaultDescription = "Professional Home & Personal Services at Your Doorstep in Chirala. Book trusted experts for cleaning, plumbing, beauty, repairs and more.";
  const defaultOgImage = "/logo.png";
  const siteUrl = "https://chiralaallroundservices.in";

  const fullTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
  const fullDescription = description || defaultDescription;
  const fullCanonical = canonical ? `${siteUrl}${canonical}` : siteUrl;
  const fullOgImage = ogImage || defaultOgImage;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:site_name" content={defaultTitle} />
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullOgImage} />
      {/* Canonical */}
      <link rel="canonical" href={fullCanonical} />
    </Helmet>
  );
};

export default SEO;
