import type { Letter, SantaMailbox } from './types';

export function parseLetter(fields: Record<string, any>): Letter {
    return {
        sender: fields.sender as string,
        message: fields.message as string,
        letterNumber: Number(fields.letter_number),
        sentAt: Number(fields.sent_at),
    };
}

export function parseSantaMailbox(
    objectId: string,
    fields: Record<string, any>,
): SantaMailbox {
    const rawLetters = (fields.letters ?? []) as any[];
    const letters: Letter[] = rawLetters.map((l: any) => {
        const f = l.fields ?? l;
        return parseLetter(f);
    });

    return {
        id: objectId,
        season: fields.season as string,
        isOpen: Boolean(fields.is_open),
        letterCount: Number(fields.letter_count),
        letters,
    };
}
