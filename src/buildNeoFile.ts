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

type FilesInMemory = Record<string, Uint8Array>;
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
 * Confirms whether the given file name matches the requested ROM type.
 * So it will confirm if a file is say a C ROM based on the file name
 *
 * The currently supported formats:
 * 1. <misc text>-<romType><number>.<romType><number>, ie "089-c1.c1"
 * 2. <misc text>-<romType><number>.rom (or .bin), ie "kof94_p1.rom" or "kof94_p1.bin"
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
 * @returns {Uint8Array} a binary array of all the matching data
 */
function getData(
    files: FilesInMemory,
    fileType: FileTypes,
    numberIncluded: boolean = false
): Uint8Array {
    return Object.keys(files)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .reduce<Uint8Array>((building, fileName) => {
            const lowerName = fileName.toLowerCase();

            if (isFileOfType(lowerName, fileType, numberIncluded)) {
                const toConcat = files[fileName];
                return new Uint8Array([...building, ...toConcat]);
            } else {
                return building;
            }
        }, new Uint8Array());
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
 * @returns {Uint8Array} the game's V ROM data
 */
function getVData(files: FilesInMemory): Uint8Array {
    let v1Data = getData(files, "v1");
    let v2Data = getData(files, "v2");

    if (v1Data.length === 0) {
        v1Data = getData(files, "v");
    }

    v1Data = padToNearest(v1Data, SIXTY_FOUR_KB);
    v2Data = padToNearest(v2Data, SIXTY_FOUR_KB);

    return new Uint8Array([...v1Data, ...v2Data]);
}

/**
 * Takes a given array and interleaves its bytes, grabbing bytes from the first
 * half then the second half of the buffer.
 *
 * This is used to interleave C ROM data, as the .neo format requires it to be interleaved
 *
 * @param {Uint8Array} twoBankArray the input array to interleave
 * @param {number} [leafSize] how big the interleaves should be
 * @returns {Uint8Array} the interleaved array
 */
function interleave(twoBankArray: Uint8Array, leafSize: number): Uint8Array {
    const interleavedArray = new Uint8Array(twoBankArray.length);
    const halfLength = twoBankArray.length / 2;

    let ilbi = 0;

    for (let i = 0; i < halfLength; i += leafSize) {
        for (let f = 0; f < leafSize; ++f) {
            interleavedArray[ilbi] = twoBankArray[i + f];
            interleavedArray[ilbi + leafSize] =
                twoBankArray[i + halfLength + f];
        }

        ilbi += leafSize * 2;
    }

    return interleavedArray;
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
 * @returns {Uint8Array} an array containing all of the game's C ROM data
 */
function getCData(files: FilesInMemory): Uint8Array {
    const arrays = [];
    let totalSize = 0;

    let index = 1;
    let oddData = getData(files, `c${index}` as FileTypes, true);
    let evenData = getData(files, `c${index + 1}` as FileTypes, true);

    while (oddData.length > 0) {
        const cRomPairNotInterleaved = new Uint8Array([
            ...oddData,
            ...evenData,
        ]);
        const interleaved = interleave(cRomPairNotInterleaved, 1);
        arrays.push(interleaved);
        totalSize += interleaved.length;

        index += 2;
        oddData = getData(files, `c${index}` as FileTypes, true);
        evenData = getData(files, `c${index + 1}` as FileTypes, true);
    }

    return arrays.reduce<Uint8Array>((building, a, i) => {
        return new Uint8Array([...building, ...a]);
    }, new Uint8Array());
}

/**
 * Takes an array that is 2 megabytes in size and swaps the megabytes.
 * This is required for large P ROMs, such as in King of Fighters 94. The Neo Geo
 * can only address 1 meg of P ROM data at once, so the game will bank switch the two megs.
 * It turns out the second meg needs to get written to the .neo file first.
 *
 * @param {Uint8Array} data the array to swap the megs on
 * @returns {Uint8Array} an array with data's megs swapped
 */
function swapMegs(data: Uint8Array): Uint8Array {
    if (data.length !== TWO_MEGS) {
        throw new Error("swapMegs: asked to swap something that is not 2mib");
    }

    const asArray = Array.from(data);

    const firstMeg = asArray.slice(0, ONE_MEG);
    const secondMeg = asArray.slice(ONE_MEG, TWO_MEGS);

    return new Uint8Array([...secondMeg, ...firstMeg]);
}

function roundUpToNearest(value: number, multiple: number): number {
    const amountToAdd = multiple - (value % multiple);

    if (amountToAdd === multiple) {
        return value;
    }

    return value + amountToAdd;
}

function padToNearest(data: Uint8Array, byteMultiple: number): Uint8Array {
    const amountToPad = byteMultiple - (data.length % byteMultiple);

    if (amountToPad === byteMultiple) {
        return data;
    }

    const padding = new Array(amountToPad).fill(0xff, 0, amountToPad);

    return new Uint8Array([...data, ...padding]);
}

/**
 * Returns the P ROM data. If a P ROM is 2 megabytes, the megs need to be swapped,
 * else just return the P ROM as-is.
 *
 * see: https://forums.terraonion.com/viewtopic.php?f=9&p=3342#p3342
 *
 * @param {FilesInMemory} files a game loaded into memory
 * @returns {Uint8Array} the P ROM data for the game
 */
function getPData(files: FilesInMemory): Uint8Array {
    let pData = getData(files, "p");

    if (pData.length === TWO_MEGS) {
        console.log("swapping P ROM megs");
        pData = swapMegs(pData);
    }

    return pData;
}

function getScreenshotNumber(rawScreenshotInput: string | undefined): number {
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
            "it will be ignored, screenshot will be zero"
        );
    }

    return 0;
}

/**
 * Convert the raw NGH input from the command line into a value that can be stored
 * in the metadata section.
 */
function getNGHNumber(rawNGHInput: string | undefined): number {
    if (rawNGHInput === undefined) {
        return 0;
    }

    // see the comment above about why we're acting as if it is a hex number
    const parsedAsIfHex = parseInt(rawNGHInput, 16);

    if (!isNaN(parsedAsIfHex)) {
        return parsedAsIfHex;
    }

    if (typeof rawNGHInput === "string") {
        console.warn(
            "Invalid NGH argument provided,",
            rawNGHInput,
            "it will be ignored, NGH will be zero"
        );
    }

    return 0;
}

function stringToUint8Array(s: string): Uint8Array {
    return new Uint8Array(s.split("").map((c) => c.charCodeAt(0)));
}

/**
 * The main orchestrator for building a .neo file.
 */
function buildNeoFile(
    options: ConvertOptions,
    files: FilesInMemory
): Uint8Array {
    // NEO1 : uint8_t header1, header2, header3, version;
    const tag = new Uint8Array([
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
    // each size value is 4 bytes, so pack a 32 bit array into an 8 bit array
    const sizes = new Uint8Array(
        new Uint32Array([
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

    // each value is 4 bytes, so pack a 32 bit array into an 8 bit array
    const metadata = new Uint8Array(
        new Uint32Array([options.year, options.genre, screenshot, NGH]).buffer
    );

    const name = stringToUint8Array(options.name);

    const namePadding = new Array(33 - options.name.length).fill(
        0,
        0,
        33 - options.name.length
    );

    const manufacturer = stringToUint8Array(options.manufacturer);

    const manLength = options.manufacturer.length;
    const manufacturerPadding = new Array(17 - manLength).fill(
        0,
        0,
        17 - manLength
    );

    const fillerLength = 128 + 290 + 4096 - 512;
    const filler = new Array(fillerLength).fill(0, 0, fillerLength);

    console.log("tag.length", tag.length);
    console.log("sizes.length", sizes.length);
    console.log("metadata.length", metadata.length);
    console.log("name offset", tag.length + sizes.length + metadata.length);
    const header = new Uint8Array([
        ...tag,
        ...sizes,
        ...metadata,
        ...name,
        ...namePadding,
        ...manufacturer,
        ...manufacturerPadding,
        ...filler,
    ]);

    const neoFile = new Uint8Array([
        ...header,
        ...pData,
        ...sData,
        ...mData,
        ...vData,
        ...cData,
    ]);

    console.log("neoFile.length", neoFile.length);

    return neoFile;
}

export { buildNeoFile };
export type { ConvertOptions, FilesInMemory };
