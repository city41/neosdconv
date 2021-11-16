const Genre = {
    Other: 0,
    Action: 1,
    BeatEmUp: 2,
    Sports: 3,
    Driving: 4,
    Platformer: 5,
    Mahjong: 6,
    Shooter: 7,
    Quiz: 8,
    Fighting: 9,
    Puzzle: 10,
} as const;

type GenreKey = keyof typeof Genre;
export type { GenreKey} ;
export { Genre };
