import fs from "fs";
import { Genre, GenreKey } from "./genres";

type Header = {
    sizes: {
        p: number;
        s: number;
        m: number;
        v1: number;
        v2: number;
        c: number;
    };
    metadata: {
        name: string;
        manufacturer: string;
        year: number;
        genre: GenreKey;
        screenshot: number;
        NGH: string;
    };
};

const HEADER_SIZE = 91;

function pad(raw: string | number, length: number): string {
    const s = raw.toString();

    let padding = "";
    if (s.length < length) {
        padding = new Array(length - s.length).fill(" ").join("");
    }

    return s + padding;
}

function hex(n: number): string {
    return n.toString(16);
}

function ascii(n: number): string {
    if (n === 0) {
        return "";
    }

    return String.fromCharCode(n);
}

function to32(data: number[]): number {
    return (data[3] << 24) | (data[2] << 16) | (data[1] << 8) | data[0];
}

function toGenreString(genreValue: number): GenreKey {
    const entries = Object.entries(Genre);
    const entry = entries.find(e => e[1] === genreValue);

    return (entry?.[0] ?? "Other") as GenreKey;
}

function toNGH(data: number[]): string {
    const asHex = data.map(hex).reverse();
    const asString = asHex.join("");

    let leadingZero = 0;

    while (asString[leadingZero] === "0" && leadingZero < asString.length) {
        ++leadingZero;
    }

    return asString.substring(leadingZero);
}

function parse(data: number[]): Header {
    return {
        sizes: {
            p: to32(data.slice(0x4, 0x4 + 4)),
            s: to32(data.slice(0x8, 0x8 + 4)),
            m: to32(data.slice(0xc, 0xc + 4)),
            v1: to32(data.slice(0x10, 0x10 + 4)),
            v2: to32(data.slice(0x14, 0x14 + 4)),
            c: to32(data.slice(0x18, 0x18 + 4))
        },
        metadata: {
            name: data
                .slice(0x2c, 0x2c + 0x21)
                .map(ascii)
                .join(""),
            manufacturer: data
                .slice(0x4d, 0x4d + 0x11)
                .map(ascii)
                .join(""),
            year: to32(data.slice(0x1c, 0x1c + 4)),
            genre: toGenreString(to32(data.slice(0x20, 0x20 + 4))),
            screenshot: to32(data.slice(0x24, 0x24 + 4)),
            NGH: toNGH(data.slice(0x28, 0x28 + 4))
        }
    };
}

function dumpHeader(neoFilePath: string) {
    const buffer = fs.readFileSync(neoFilePath);
    const data = Array.from(buffer).slice(0, HEADER_SIZE);

    const header = parse(data);

    console.log(header.metadata.name);
    console.log("----------------------");
    console.log("manufacturer:", header.metadata.manufacturer);
    console.log("        year:", header.metadata.year);
    console.log("       genre:", header.metadata.genre);
    console.log("         NGH:", header.metadata.NGH);
    console.log("  screenshot:", header.metadata.screenshot);
    console.log();
    console.log("---- ROM sizes -------");

    Object.keys(header.sizes).forEach(romType => {
        const value = header.sizes[romType as keyof typeof header.sizes];
        const spacer = romType.length === 1 ? " " : "";

        console.log(
            `${spacer}           ${romType}:`,
            pad(value, 12),
            `0x${hex(value)}`
        );
    });
}

export { dumpHeader };
