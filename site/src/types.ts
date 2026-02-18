export interface Game {
    dirName: string;
    name: string;
    slug: string;
    tags: string[];
    description: string;
    hasFrontend: boolean;
    cover: string | null;
}
