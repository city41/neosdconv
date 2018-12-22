import fs from "fs";
import path from "path";
import tmp from "tmp";
import extract from "extract-zip";

type ConvertCallback = (err: Error | null, resultingPath?: string) => void;
type FilesInMemory = { [key: string]: Buffer };
type FileTypes = "p" | "s" | "m" | "v1" | "v2" | "c";

function loadFilesIntoMemory(dir: string): FilesInMemory {
    return fs.readdirSync(dir).reduce(
        (building, file) => {
            const fullPath = path.join(dir, file);
            const fileData = fs.readFileSync(fullPath);

            building[file] = fileData;

            return building;
        },
        {} as FilesInMemory
    );
}

function isFileOfType(fileName: string, fileType: FileTypes): boolean {
    const lowerName = fileName.toLowerCase();

    return !!lowerName.match(new RegExp(`${fileType}\d`));
}

function getSize(files: FilesInMemory, fileType: FileTypes): number {
    return Object.keys(files).reduce((buildingSize, fileName) => {
        if (isFileOfType(fileName, fileType)) {
            return buildingSize + files[fileName].length;
        } else {
            return buildingSize;
        }
    }, 0);
}

function buildNeoFile(romName: string, files: FilesInMemory): Buffer {
    // NEO1 : uint8_t header1, header2, header3, version;
    const tag = Buffer.from([
        "N".charCodeAt(0),
        "E".charCodeAt(0),
        "O".charCodeAt(0),
        1
    ]);

    // PSize, SSize, MSize, V1Size, V2Size, CSize
    const sizes = Buffer.from(
        Uint32Array.from([
            getSize(files, "p"),
            getSize(files, "s"),
            getSize(files, "m"),
            getSize(files, "v1"),
            getSize(files, "v2"),
            getSize(files, "c")
        ])
    );

    // year, genre, screenshot, NGH, all dummy data for now
    const metadata = Buffer.from(
        Uint32Array.from([new Date().getFullYear(), 0, 0, 0])
    );

    const name = Buffer.from(romName);
    const namePadding = Buffer.from(
        new Array(33 - romName.length).fill(0, 0, 33 - romName.length)
    );

    const manufacturer = Buffer.from("SNK");
    const manufacturerPadding = Buffer.from(new Array(14).fill(0, 0, 14));

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
    const v1Data = getData(files, "v1");
    const v2Data = getData(files, "v2");
    const cData = getData(files, "c");

    const neoFile = Buffer.concat(
        [header, pData, sData, mData, v1Data, v2Data, cData],
        header.length +
            pData.length +
            sData.length +
            mData.length +
            v1Data.length +
            v2Data.length +
            cData.length
    );

    return neoFile;
}

export function convertOneRom(
    srcPath: string,
    outDir: string,
    callback: ConvertCallback
): void {
    const romName = path.basename(srcPath, path.extname(srcPath));

    tmp.dir({ unsafeCleanup: true }, (err, tmpDir) => {
        if (err) {
            return callback(err);
        }

        extract(srcPath, { dir: tmpDir }, err => {
            if (err) {
                return callback(err);
            }

            const files = loadFilesIntoMemory(tmpDir);

            const neoFile = buildNeoFile(romName, files);
        });
    });
}
