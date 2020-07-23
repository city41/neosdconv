import fs from "fs";
import path from "path";

const SIXTY_FOUR_KB = 64 * 1024;
const TWO_FIFTY_SIX_KB = 256 * 1024;
const ONE_MEG = 0x100000;
const TWO_MEGS = ONE_MEG * 2;

type ConvertOptions = {
    name: string;
    genre: number;
    year: number;
    manufacturer: string;
    ngh?: string;
    screenshot?: string;
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

/**
 * Takes the various ROM files (p, m, c, etc) found in the specified directory
 * and loads them into memory. The return result is an object with keys being the
 * file names and the values being Buffers containing the binary data for that file
 *
 * @param {string} dir The directory to load the ROM files from
 * @returns {FilesInMemory} an object containing the binary data of each file
 */
function loadFilesIntoMemory(dir: string): FilesInMemory {
    return fs.readdirSync(dir).reduce((building, file) => {
        // lots of roms have an html file inside
        if (file.trim().toLowerCase().endsWith(".html")) {
            return building;
        }

        // extracting a zipped rom into the same directory is common
        if (file.trim().toLowerCase().endsWith(".zip")) {
            return building;
        }

        const fullPath = path.join(dir, file);

        // ignore any directories
        if (fs.lstatSync(fullPath).isDirectory()) {
            return building;
        }

        const fileData = fs.readFileSync(fullPath);

        building[file] = fileData;

        return building;
    }, {} as FilesInMemory);
}

/**
 * Confirms whether the given file name matches the requested ROM type.
 * So it will confirm if a file is say a C ROM based on the file name
 *
 * The currently supported formats:
 * 1. <misc text>-<romType><number>.<romType><number>, ie "089-c1.c1"
 * 2. <misc text>-<romType><number>.rom, ie "kof94_p1.rom"
 *
 * @param {string} fileName
 * @param {FileTypes} fileType the type of file to check for, ie 'c' or 'p', etc
 * @returns {boolean} true if the file is of the checked type
 */
function isFileOfType(
    fileName: string,
    fileType: FileTypes,
    numberIncluded: boolean = false
): boolean {
    const lowerName = fileName.toLowerCase();
    const numberRegex = numberIncluded ? ".?" : "\\d.?";

    const matchesInNameWithRomExtension = !!lowerName.match(
        new RegExp(`${fileType}${numberRegex}\\.(rom|bin)$`)
    );

    const matchesInNameWithRomTypeExtension = !!lowerName.match(
        new RegExp(`${fileType}${numberRegex}\\.${fileType}${numberRegex}$`)
    );

    return matchesInNameWithRomExtension || matchesInNameWithRomTypeExtension;
}

/**
 * Gets the total size of all of the ROMs of the requested type. So if 'c' was requested,
 * This will add up the sizes of all the C ROMs in the game and return that
 *
 * @param {FilesInMemory} files a game loaded into memory
 * @param {FileType} fileType the file type to check
 * @returns {number} the size of all the ROMs that match the check
 */
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

/**
 * Gets all of the data of the specified type. So if 'v' is requested,
 * this will return one Buffer with all of the V ROM data inside it, in order
 * based on file name (ie v1, v2, v3, etc)
 *
 * @param {FilesInMemory} files a game loaded into memory
 * @param {FileTypes} fileType the fileType to get the data for
 * @returns {Buffer} a binary buffer of all the matching data
 */
function getData(
    files: FilesInMemory,
    fileType: FileTypes,
    numberIncluded: boolean = false
): Buffer {
    let size = 0;

    const buffers = Object.keys(files)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .reduce((buildingBuffers, fileName) => {
            const lowerName = fileName.toLowerCase();

            if (isFileOfType(lowerName, fileType, numberIncluded)) {
                console.log("getData, file", fileName);
                size += files[fileName].length;
                return buildingBuffers.concat(files[fileName]);
            } else {
                return buildingBuffers;
            }
        }, [] as Buffer[]);

    return Buffer.concat(buffers, size);
}

/**
 * V ROMs can come in two flavors, either a v1/v2 combo, or a singular V section.
 * League Bowling is an example of a game with a v1/v2 combo.
 *
 * This function figures out if the game is a v1/v2 or v style game, and returns the v1
 * and v2 sizes accordingly (so if the game is v style, v2 will be zero)
 *
 * @param {FilesInMemory} files a game loaded into memory
 * @returns {Object} an object containing v1 and v2 sizes
 */
function getVSizes(files: FilesInMemory) {
    const v2Size = getSize(files, "v2");

    if (v2Size > 0) {
        const v1Size = getSize(files, "v1");

        return {
            v1: roundUpToNearest(v1Size, SIXTY_FOUR_KB),
            v2: roundUpToNearest(v2Size, SIXTY_FOUR_KB),
        };
    } else {
        return {
            v1: roundUpToNearest(getSize(files, "v"), SIXTY_FOUR_KB),
            v2: 0,
        };
    }
}

/**
 * Returns a single Buffer containing all of the game's V ROM data.
 * It will handle whether the game is a v1/v2 or v style game
 *
 * @param {FilesInMemory} files a game loaded into memory
 * @returns {Buffer} the game's V ROM data
 */
function getVData(files: FilesInMemory): Buffer {
    let v2Data = getData(files, "v2");
    let v1Data = getData(files, "v1");

    if (v1Data.length === 0) {
        v1Data = getData(files, "v");
    }

    v1Data = padToNearest(v1Data, SIXTY_FOUR_KB);
    v2Data = padToNearest(v2Data, SIXTY_FOUR_KB);

    return Buffer.concat([v1Data, v2Data], v1Data.length + v2Data.length);
}

/**
 * Takes a given buffer and interleaves its bytes, grabbing bytes from the first
 * half then the second half of the buffer.
 *
 * This is used to interleave C ROM data, as the .neo format requires it to be interleaved
 *
 * @param {Buffer} twoBankBuffer the input buffer to interleave
 * @param {number} [leafSize] how big the interleaves should be, default is 1 byte
 * @returns {Buffer} the interleaved buffer
 */
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

/**
 * Pulls all of the C ROM data out of the game and returns it in a single buffer
 * that matches the format that is needed for .neo files. Each C ROM pair, ie c1/c2,
 * c3/c4 need to be interleaved together.
 *
 * The resulting buffer will have bytes like
 * c1, c2, c1, c2, c1, c2 ... , c3, c4, c3, c4, ...
 *
 * @param {FilesInMemory} files a game loaded into memory
 * @returns {Buffer} a buffer containing all of the game's C ROM data
 */
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

/**
 * Takes a buffer that is 2 megabytes in size and swaps the megabytes.
 * This is required for large P ROMs, such as in King of Fighters 94. The Neo Geo
 * can only address 1 meg of P ROM data at once, so the game will bank switch the two megs.
 * It turns out the second meg needs to get written to the .neo file first.
 *
 * @param {Buffer} data the buffer to swap the megs on
 * @returns {Buffer} a buffer with data's megs swapped
 */
function swapMegs(data: Buffer): Buffer {
    debugger;
    if (data.length !== TWO_MEGS) {
        throw new Error("swapMegs: asked to swap something that is not 2mib");
    }

    const firstMeg = Buffer.from(data.buffer, 0, ONE_MEG);
    const secondMeg = Buffer.from(data.buffer, ONE_MEG, ONE_MEG);

    return Buffer.concat([secondMeg, firstMeg], TWO_MEGS);
}

function roundUpToNearest(value: number, multiple: number): number {
    const amountToAdd = multiple - (value % multiple);

    if (amountToAdd === multiple) {
        return value;
    }

    return value + amountToAdd;
}

function padToNearest(data: Buffer, byteMultiple: number): Buffer {
    const amountToPad = byteMultiple - (data.length % byteMultiple);

    if (amountToPad === byteMultiple) {
        return data;
    }

    const padding = Buffer.from(
        Uint32Array.from(new Array(amountToPad).fill(0xff, 0, amountToPad))
    );

    return Buffer.concat([data, padding], data.length + padding.length);
}

/**
 * Returns the P ROM data. If a P ROM is 2 megabytes, the megs need to be swapped,
 * else just return the P ROM as-is.
 *
 * see: https://forums.terraonion.com/viewtopic.php?f=9&p=3342#p3342
 *
 * @param {FilesInMemory} files a game loaded into memory
 * @returns {Buffer} the P ROM data for the game
 */
function getPData(files: FilesInMemory): Buffer {
    let pData = getData(files, "p");

    if (pData.length === TWO_MEGS) {
        console.log("swapping P ROM megs");
        pData = swapMegs(pData);
    }

    return pData;
}

function getScreenshotNumber(rawScreenshotInput: string | undefined) {
    if (rawScreenshotInput === undefined) {
        return 0;
    }

    const asNumber = parseInt(rawScreenshotInput, 10);

    if (!isNaN(asNumber)) {
        return asNumber;
    }

    if (typeof rawScreenshotInput === "string") {
        console.warn(
            "Invalid screenshot argument provided,",
            rawScreenshotInput,
            "it will be ignored"
        );
    }

    return 0;
}

/**
 * Convert the raw NGH input from the command line into a value that can be stored
 * in the metadata section.
 *
 * NOTE: TerraOnion stores this rather strangely. They store the decimal value as if it is
 * hex. So for example, RBFF's NGH number is decimal 95, and in the .neo file it is stored as
 * '95 00 00 00'. Or tame Neo Turf Masters, NGH is decimal 200, stored in the .neo file as '00 02 00 00'
 * Very strange, but I guess it makes looking at the value in a hex editor easier? who knows
 */
function getNGHNumber(rawNGHInput: string | undefined) {
    if (rawNGHInput === undefined) {
        return 0;
    }

    const parsedAsIfHex = parseInt(rawNGHInput, 16);

    if (!isNaN(parsedAsIfHex)) {
        return parsedAsIfHex;
    }

    if (typeof rawNGHInput === "string") {
        console.warn(
            "Invalid NGH argument provided,",
            rawNGHInput,
            "it will be ignored"
        );
    }

    return 0;
}

/**
 * The main orchestrator for building a .neo file.
 */
function buildNeoFile(options: ConvertOptions, files: FilesInMemory): Buffer {
    // NEO1 : uint8_t header1, header2, header3, version;
    const tag = Buffer.from([
        "N".charCodeAt(0),
        "E".charCodeAt(0),
        "O".charCodeAt(0),
        1,
    ]);

    const vSizes = getVSizes(files);

    const cData = padToNearest(getCData(files), TWO_FIFTY_SIX_KB);
    console.log("C data length", cData.length);
    const pData = padToNearest(getPData(files), SIXTY_FOUR_KB);
    console.log("P data length", pData.length);
    const sData = padToNearest(getData(files, "s"), SIXTY_FOUR_KB);
    console.log("S data length", sData.length);
    const mData = padToNearest(getData(files, "m"), SIXTY_FOUR_KB);
    console.log("M data length", mData.length);
    // getVData pads to 64kb
    const vData = getVData(files);
    console.log("V data length", vData.length);

    // PSize, SSize, MSize, V1Size, V2Size, CSize
    const sizes = Buffer.from(
        Uint32Array.from([
            pData.length,
            sData.length,
            mData.length,
            vSizes.v1,
            vSizes.v2,
            cData.length,
        ]).buffer
    );

    // year, genre, screenshot, NGH
    const screenshot = getScreenshotNumber(options.screenshot);
    const NGH = getNGHNumber(options.ngh);

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
            filler,
        ],
        4096
    );

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

/**
 * External API entry point for converting a ROM from standard format
 * to the .neo format
 *
 * @param {string} srcDir the directory to read the ROM files from
 * @param {string} outPath the file to write the result to
 * @param {ConvertOptions} options settings such as game name and year
 * @param {ConvertCallback} callback called once the conversion is done
 */
export function convertRom(
    srcDir: string,
    outPath: string,
    options: ConvertOptions,
    callback: ConvertCallback
): void {
    const files = loadFilesIntoMemory(srcDir);

    const neoFile = buildNeoFile(options, files);

    fs.writeFile(outPath, neoFile, (err: NodeJS.ErrnoException | null) => {
        if (err) {
            callback(err);
        } else {
            callback(null, outPath);
        }
    });
}
