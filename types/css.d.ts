declare module "*.css";
declare module "*.scss";
declare module "*.module.css";
declare module "*.module.scss";

// Optionally declare other asset types used as imports
declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
