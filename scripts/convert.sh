#!/usr/bin/env sh

#set -x

CSV_IN=neosd_romset.csv

usage() {
	echo "Usage: $0 <input> [<output dir> [CSV]]"
	echo ""
	echo "  Convert a single ROM set archive or a folder of archives from"
	echo "  traditional NeoGeo ROM sets to the NeoSD .neo format"
	echo ""
	echo "  <input>       - Can be a single archive file or folder with multiple archives"
	echo "  <output dir>  - Output directory, if not specified, defaults to PWD"
	echo "  [CSV]         - CSV file that is used as a lookup table for ROM sets"
	echo "    See the CSV file, \"${CSV_IN}\", for the layout of this CSV file"
	echo "    If [CSV] is unspecified, defaults to \"${CSV_IN}\""
	echo ""
	echo "  Requires neosdconv, unzip, sed, and awk"
	echo ""
}

# Requires FILE and CSV to be set
get_rom_info_from_csv() {
	# Look up file in CSV
	FILENAME=$(basename -- "${FILE}")
	BASENAME="${FILENAME%.*}"
	LINE=$(awk -F"," '{print $1}' "${CSV}" |  grep -n "\<${BASENAME}\>" | sed -e 's/:.*//')

	if [ -z "${LINE}" ] ; then
		echo "Unknown ROM set name \"${FILENAME}\". Check \"${CSV_IN}\" to ensure the set is defined there."
		return 1;
	fi

	if [ -e "${OUTPUT}/${BASENAME}".neo ] ; then
		echo "Skipping \"${FILENAME}\", \"${BASENAME}.neo\" already exists in output directory." >> output.log
		NOTIFY=1
		return 1;
	fi

	# Get some file info
	ROMSET=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $1}' "${CSV}")
	SCREENSHOT=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $2}' "${CSV}")
	NGH=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $3}' "${CSV}")
	TITLE=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $4}' "${CSV}")
	GENRE=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $5}' "${CSV}")
	YEAR=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $6}' "${CSV}")
	DEV=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $7}' "${CSV}")
	PARENT=$(awk -vLINE="${LINE}" -F"," '{if(NR==LINE) print $8}' "${CSV}")

	if [ ! -z "${PARENT}" ];then
		echo "Skipping \"${FILENAME}\", ROMs requiring a parent ROM are unsupported at this time" >> output.log
		NOTIFY=1
		return 1
	fi

	echo "Processing \"${FILENAME}\" -- \"${TITLE}\" as \"${BASENAME}.neo\""

	return 0
}

# Requires TMPDIR and FILE to be set
unpack_rom_archive() {
	case "${FILE##*.}" in
		"zip")
			unzip -d "${TMPDIR}" "${FILE}" >>output.log 2>&1
			if [ "${?}" -ne 0 ]; then
				echo "Unzip failed, see \"output.log\" for more information"
				return 1;
			fi
			;;

		*)
			echo -n "Archive format \"${FILE##*.}\" not supported. "
			echo "Please add it to \"unpack_rom_archive()\""
			return 1;
			;;
	esac

	return 0;
}

# Requires get_rom_info and unpack_rom_archive to have been run, TMPDIR and OUTPUT to be set
process_rom_dir() {
	# Titles are limited to 33 chars long
	TITLE=$(echo "${TITLE}" | cut -c -33)
	neosdconv -i "${TMPDIR}" -o "${OUTPUT}"/"${BASENAME}".neo -n "${TITLE}" -g "${GENRE}" -y "${YEAR}" -m "${DEV}" -# "${NGH}" -s "${SCREENSHOT}" >>output.log 2>&1
	if [ "${?}" -ne 0 ]; then
		return 1
	fi

	return 0
}

process_dir() {
	for FILE in "${INPUT}"/* ; do

		if [ ! -f "${FILE}" ] ; then continue; fi

		# XXX: Add output to debug log if following condition is true
		if ! get_rom_info_from_csv ; then continue; fi

		# Unpack archive to folder
		TMPDIR=$(mktemp -d)
		if ! unpack_rom_archive ; then
			echo "Failure to unpack \"${FILE}\". See output.log"
			NOTIFY=1
			rm -rf "${TMPDIR}"
			continue;
		fi

		if ! process_rom_dir ; then
			echo "Failure in processing \"${ROMSET}\". See output.log"
			NOTIFY=1
			rm -rf "${TMPDIR}"
			continue;
		fi

		# Clean up
		rm -rf "${TMPDIR}"
	done
}

process_file() {
	FILE="${INPUT}"
	if ! get_rom_info_from_csv ; then return 1; fi

	# Unpack archive to folder
	TMPDIR=$(mktemp -d)
	if ! unpack_rom_archive ; then
		echo "Failure to unpack \"${FILE}\". See output.log"
		NOTIFY=1
		rm -rf "${TMPDIR}"
		return 1
	fi

	if ! process_rom_dir ; then
		echo "Failure in processing \"${ROMSET}\". See output.log"
		NOTIFY=1
		rm -rf "${TMPDIR}"
		return 1
	fi

	# Clean up
	rm -rf "${TMPDIR}"
}


command -v unzip >/dev/null 2>&1
if [ $? -ne 0 ] ; then
	echo "Error, 'unzip' not executable or not in PATH"
	exit 1
fi

command -v neosdconv >/dev/null 2>&1
if [ $? -ne 0 ] ; then
	echo "Error, 'neosdconv' not executable or not in PATH"
	exit 1
fi

# Requires at least 1 arg, can be up to 3
if [ "${#}" -lt 1 ] || [ "${#}" -gt 3 ]; then 
	usage
	return 1
fi

INPUT="${1}"
if [ "${#}" -eq 1 ]; then
	OUTPUT=$(pwd)
else
	OUTPUT="${2}"
fi

if [ "${#}" -eq 3 ]; then
	CSV_IN="${3}"
fi

# Make a tmp file of our CSV with all of the comments and empty lines removed
CSV=$(mktemp)
sed -e '/^#/d' -e '/^\s/d' "${CSV_IN}"  > "${CSV}"

rm output.log >/dev/null 2>&1

# Was the script given a single file or a whole directory
if [ -d "${INPUT}" ]; then
	process_dir
else
	if [ ! -f "${INPUT}" ]; then
		echo "Invalid input file \"${INPUT}\""
	else
		process_file
	fi
fi

if [ ! -z "${NOTIFY}" ]; then
	echo "One or more files were skipped or had errors, see \"output.log\" for more details"
fi

# Clean up
rm "${CSV}"
