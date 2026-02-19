export interface Letter {
    sender: string;
    message: string;
    letterNumber: number;
    sentAt: number;
}

export interface SantaMailbox {
    id: string;
    season: string;
    isOpen: boolean;
    letterCount: number;
    letters: Letter[];
}
