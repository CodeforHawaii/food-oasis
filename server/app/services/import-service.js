const parse = require("csv-parse");
const esriService = require("./esri-service");
const { Readable } = require("stream");
const stakeholderService = require("./stakeholder-service");

function formatMapAddress(formData) {
  return `${formData.address_1 || ""} ${formData.address_2 || ""} ${
    formData.city || ""
  }, ${formData.state || ""} ${formData.zip || ""}`;
}

// we can use this function to reformat the field names/values in the csv before rendering in browser table
const parseCsv = async (file) => {
  // memory storage
  const { buffer } = file;
  const stream = Readable.from(buffer.toString());
  // disk storage
  // const stream = fs.createReadStream(file.path, "utf8");
  let rowArray = [];
  const parser = stream.pipe(
    parse({
      delimiter: ",",
      columns: true,
      trim: true,
    })
  );

  for await (const row of parser) {
    if (row.latitude && row.longitude) {
      const newRow = await {
        ...row,
        selectedCategoryIds: row.selectedCategoryIds.split(","),
        latitude: +row.latitude,
        longitude: +row.longitude,
      };
      rowArray.push(newRow);
    } else {
      const response = await esriService.geocode(formatMapAddress(row));
      const newRow = await {
        ...row,
        selectedCategoryIds: row.selectedCategoryIds.split(","),
        latitude: response[0].attributes.Y,
        longitude: response[0].attributes.X,
      };
      rowArray.push(newRow);
    }
  }
  return rowArray;
};

const importCsv = async (data, action, tenantId) => {
  try {
    await stakeholderService.insertBulk(data, action, tenantId);
  } catch (err) {
    console.error(err.message);
  }
};

module.exports = {
  parseCsv,
  importCsv,
};
