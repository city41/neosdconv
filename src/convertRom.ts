import fs from "fs";
import path from "path";

type ConvertOptions = {
    name: string;
    genre: number;
    year: number;
    manufacturer: string;
};
type ConvertCallback = (err: Error | null, resultingPath?: string) => void;
type FilesInMemory = { [key: string]: Buffer };
type FileTypes =
    | "p"
    | "s"
    | "m"
    | "v"
    | "v1"
    | "v2"
    | "c1"
    | "c2"
    | "c3"
    | "c4"
    | "c5"
    | "c6"
    | "c7"
    | "c8";

function loadFilesIntoMemory(dir: string): FilesInMemory {
    return fs.readdirSync(dir).reduce(
        (building, file) => {
            // lots of roms have an html file inside
            if (file.indexOf(".html") > -1) {
                return building;
            }

            const fullPath = path.join(dir, file);
            const fileData = fs.readFileSync(fullPath);

            building[file] = fileData;

            return building;
        },
        {} as FilesInMemory
    );
}

function isFileOfType(
    fileName: string,
    fileType: FileTypes,
    numberIncluded: boolean = false
): boolean {
    const lowerName = fileName.toLowerCase();
    const numberRegex = numberIncluded ? "" : "\\d";

    const matchesInNameWithRomExtension = !!lowerName.match(
        new RegExp(`${fileType}${numberRegex}\\.rom$`)
    );

    const matchesInNameWithRomTypeExtension = !!lowerName.match(
        new RegExp(`${fileType}${numberRegex}\\.${fileType}${numberRegex}$`)
    );

    return matchesInNameWithRomExtension || matchesInNameWithRomTypeExtension;
}

function getSize(files: FilesInMemory, fileType: FileTypes): number {
    return Object.keys(files).reduce((buildingSize, fileName) => {
        if (isFileOfType(fileName, fileType)) {
            console.log("getSize, file", fileName, files[fileName].length);
            return buildingSize + files[fileName].length;
        } else {
            return buildingSize;
        }
    }, 0);
}

function getData(
    files: FilesInMemory,
    fileType: FileTypes,
    numberIncluded: boolean = false
): Buffer {
    let size = 0;

    const buffers = Object.keys(files)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .reduce(
            (buildingBuffers, fileName) => {
                const lowerName = fileName.toLowerCase();

                if (isFileOfType(lowerName, fileType, numberIncluded)) {
                    console.log("getData, file", fileName);
                    size += files[fileName].length;
                    return buildingBuffers.concat(files[fileName]);
                } else {
                    return buildingBuffers;
                }
            },
            [] as Buffer[]
        );

    return Buffer.concat(buffers, size);
}

function getVSizes(files: FilesInMemory) {
    const v2Size = getSize(files, "v2");

    if (v2Size > 0) {
        return {
            v1: getSize(files, "v1"),
            v2: v2Size
        };
    } else {
        return {
            v1: getSize(files, "v"),
            v2: 0
        };
    }
}

function getVData(files: FilesInMemory): Buffer {
    const v2Data = getData(files, "v2");
    let v1Data = getData(files, "v1");

    if (v1Data.length === 0) {
        v1Data = getData(files, "v");
    }

    return Buffer.concat([v1Data, v2Data], v1Data.length + v2Data.length);
}

function interleave(twoBankBuffer: Buffer, leafSize: number): Buffer {
    const interleavedBuffer = Buffer.alloc(twoBankBuffer.length);
    const halfLength = twoBankBuffer.length / 2;

    let ilbi = 0;

    for (let i = 0; i < halfLength; i += leafSize) {
        for (let f = 0; f < leafSize; ++f) {
            interleavedBuffer[ilbi] = twoBankBuffer[i + f];
            interleavedBuffer[ilbi + leafSize] =
                twoBankBuffer[i + halfLength + f];
        }

        ilbi += leafSize * 2;
    }

    return interleavedBuffer;
}

function getCData(files: FilesInMemory): Buffer {
    const buffers = [];
    let totalSize = 0;

    let index = 1;
    let oddData = getData(files, `c${index}` as FileTypes, true);
    let evenData = getData(files, `c${index + 1}` as FileTypes, true);

    while (oddData.length > 0) {
        const cRomPairNotInterleaved = Buffer.concat(
            [oddData, evenData],
            oddData.length + evenData.length
        );
        const interleaved = interleave(cRomPairNotInterleaved, 1);
        buffers.push(interleaved);
        totalSize += interleaved.length;

        index += 2;
        oddData = getData(files, `c${index}` as FileTypes, true);
        evenData = getData(files, `c${index + 1}` as FileTypes, true);
    }

    return Buffer.concat(buffers, totalSize);
}

function buildNeoFile(options: ConvertOptions, files: FilesInMemory): Buffer {
    // NEO1 : uint8_t header1, header2, header3, version;
    const tag = Buffer.from([
        "N".charCodeAt(0),
        "E".charCodeAt(0),
        "O".charCodeAt(0),
        1
    ]);

    // PSize, SSize, MSize, V1Size, V2Size, CSize
    const vSizes = getVSizes(files);
    console.log("vSizes", vSizes);

    // the cdata needs to be interleaved
    // so first byte is from c1, second is from c2, etc
    const cData = getCData(files);

    const sizes = Buffer.from(
        Uint32Array.from([
            getSize(files, "p"),
            getSize(files, "s"),
            getSize(files, "m"),
            vSizes.v1,
            vSizes.v2,
            cData.length
        ]).buffer
    );

    // year, genre, screenshot, NGH
    const screenshot = 0; // only commercial roms can have screenshots
    const NGH = 0; // only commercial roms need NGH number

    const metadata = Buffer.from(
        Uint32Array.from([options.year, options.genre, screenshot, NGH]).buffer
    );

    const name = Buffer.from(options.name);
    const namePadding = Buffer.from(
        new Array(33 - options.name.length).fill(0, 0, 33 - options.name.length)
    );

    const manufacturer = Buffer.from(options.manufacturer);
    const manLength = options.manufacturer.length;
    const manufacturerPadding = Buffer.from(
        new Array(17 - manLength).fill(0, 0, 17 - manLength)
    );

    const fillerLength = 128 + 290 + 4096 - 512;
    const filler = Buffer.from(
        new Array(fillerLength).fill(0, 0, fillerLength)
    );

    const header = Buffer.concat(
        [
            tag,
            sizes,
            metadata,
            name,
            namePadding,
            manufacturer,
            manufacturerPadding,
            filler
        ],
        4096
    );

    const pData = getData(files, "p");
    const sData = getData(files, "s");
    const mData = getData(files, "m");
    const vData = getVData(files);

    const neoFile = Buffer.concat(
        [header, pData, sData, mData, vData, cData],
        header.length +
            pData.length +
            sData.length +
            mData.length +
            vData.length +
            cData.length
    );

    console.log("neoFile.length", neoFile.length);

    return neoFile;
}

export function convertRom(
    srcDir: string,
    outPath: string,
    options: ConvertOptions,
    callback: ConvertCallback
): void {
    const romName = path.basename(outPath, path.extname(outPath));

    const files = loadFilesIntoMemory(srcDir);

    const neoFile = buildNeoFile(options, files);

    fs.writeFile(outPath, neoFile, (err?: Error) => {
        if (err) {
            callback(err);
        } else {
            callback(null, outPath);
        }
    });
}
