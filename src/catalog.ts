export type CatalogIcon = {
    name: string;
    title: string;
    keywords: string;
};

export type Category = {
    id: string;
    title: string;
    names: string[];
};

export { CATEGORIES, ICONS } from "./catalog-data";
