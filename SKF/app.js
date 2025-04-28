const mssql = require('mssql');
const open = require("open");

var async = require("async");
var moment = require('moment');
var express = require("express"),
  app = require("express")(),
  http = require("http").Server(app),
  io = require("socket.io")(http),
  util = require("util"),
  fs = require("fs");
// app.use(cors());
const nrc = require('node-run-cmd');
const { log } = require('console');
const path = require('path');
const multer = require('multer');

const cors = require('cors');
const { Parser } = require("json2csv");
const cron = require("node-cron");
// Initialize Express app
const https = require("https");
// const fs = require("fs");
const os = require('os');

const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};
const PORT = 3000;

const lockfile = require('proper-lockfile');
// https.createServer(options, app).listen(PORT, () => {
//   console.log(`Server running at https://10.185.166.5:${PORT}`);
// });

https.createServer(options, app).listen(PORT, async () => {
  console.log(`Server running at https://10.185.166.5:${PORT}`);
  await open(`https://10.185.166.5:${PORT}/login.html`);
});

// Middleware setup
app.use(cors({ // Configure CORS
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // To parse JSON data
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data

app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use("/uploads", express.static("C:/SKF_Uploads"));

// // Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get("/quality", (req, res) => {
  res.sendFile(path.join(__dirname, "quality.html"));
});
app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/quality", (req, res) => {
  res.sendFile(path.join(__dirname, "quality.html"));
});
app.get("/weighing", (req, res) => {
  res.sendFile(path.join(__dirname, "weighing.html"));
});
app.get("/report", (req, res) => {
  res.sendFile(path.join(__dirname, "report.html"));
});
// skf mysuru **********************************************************

const dbConfig = {
     user: "admin9",
    password: "admin@123",
    database: "skf_digital_traceability",
    server: 'w5738',
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: false, // for azure
      trustServerCertificate: false // change to true for local dev / self-signed certs
    }
  };
// skf mysuru **********************************************************

// const dbConfig = {
//      user: "admin9",
//     password: "admin9",
//     database: "skf_digital_traceability",
//     server: 'DESKTOP-5UJJEQ0',
//     pool: {
//       max: 10,
//       min: 0,
//       idleTimeoutMillis: 30000
//     },
//     options: {
//       encrypt: false, // for azure
//       trustServerCertificate: false // change to true for local dev / self-signed certs
//     }
//   };
app.get('/scan', (req, res) => {
  const data = decodeURIComponent(req.query.data);
  try {
    const jsonData = JSON.parse(data);
    res.json({ success: true, data: jsonData });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid QR code data' });
  }
});

// *******************************************WEIGHNING start******************************************************
// Function to validate and format dates
function validateDate(date) {
  const parsedDate = new Date(date);
  if (!isNaN(parsedDate)) {
      return parsedDate.toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD' format
  }
  return null; // Invalid date
}

app.post('/submit', async (req, res) => {
  console.log('Received data:', req.body);

  const {
      part_no,
      part_description,
      box_no,
      date,
      time,
      channel,
      quantity_per_box,
      box_weight,
      mo,
      operator_id,
      packing_shift,
      molding_date,
      molding_shift,
      post_curing_date,
      post_curing_shift,
      finishing_date,
      finishing_shift,
      no_of_boxes,
      box_scan_counter
  } = req.body;

  try {
      const parsedDate = validateDate(date);
      console.log('Parsed date:', parsedDate); // Debugging log

      const pool = await mssql.connect(dbConfig);

      const result = await pool.request()
          .input('part_no', mssql.NVarChar(50), part_no)
          .input('part_description', mssql.NVarChar(255), part_description)
          .input('box_no', mssql.NVarChar(50), box_no)
          .input('date', mssql.Date, parsedDate)
          .input('time', mssql.NVarChar(20), time)
          .input('channel', mssql.NVarChar(50), channel)
          .input('quantity_per_box', mssql.Int, quantity_per_box)
          .input('box_weight', mssql.NVarChar(50), box_weight)
          .input('mo', mssql.NVarChar(50), mo)
          .input('operator_id', mssql.NVarChar(50), operator_id)
          .input('packing_shift', mssql.NVarChar(50), packing_shift)
          .input('molding_date', mssql.Date, validateDate(molding_date))
          .input('molding_shift', mssql.NVarChar(50), molding_shift)
          .input('post_curing_date', mssql.Date, validateDate(post_curing_date))
          .input('post_curing_shift', mssql.NVarChar(50), post_curing_shift)
          .input('finishing_date', mssql.Date, validateDate(finishing_date))
          .input('finishing_shift', mssql.NVarChar(50), finishing_shift)
          .input('no_of_boxes', mssql.Int, no_of_boxes)
          .input('box_scan_counter', mssql.Int, box_scan_counter)
          .input('status', mssql.NVarChar(50), 'Pending') // Always set status to 'Pending'
          .query(`
              INSERT INTO [dbo].[weighing_station] 
              (part_no, part_description, box_no, date, time, channel, quantity_per_box, box_weight, mo, operator_id, packing_shift, 
              molding_date, molding_shift, post_curing_date, post_curing_shift, finishing_date, finishing_shift, no_of_boxes, box_scan_counter, status)
              VALUES 
              (@part_no, @part_description, @box_no, @date, @time, @channel, @quantity_per_box, @box_weight, @mo, @operator_id, @packing_shift,
              @molding_date, @molding_shift, @post_curing_date, @post_curing_shift, @finishing_date, @finishing_shift, @no_of_boxes, @box_scan_counter, @status)
          `);

      console.log('Data inserted successfully:', result);
      res.status(200).send({ message: 'Data inserted successfully', result });
  } catch (err) {
      console.error('Database insertion error:', err);
      res.status(500).send({ error: 'Failed to insert data into the database' });
  }
});

app.post('/validate-qrcode', async (req, res) => {
  console.log("Received Data for Validation:", req.body);

  try {
      const { qrCodeData } = req.body;

      // Validate and parse JSON data
      let qrCode;
      try {
          qrCode = JSON.parse(qrCodeData); // Parse JSON
      } catch (err) {
          console.error("Invalid QR Code JSON:", err);
          return res.status(400).json({ error: "Invalid QR Code JSON data." });
      }

      console.log("Parsed QR Code Data:", qrCode);

      // Connect to the database
      const pool = await mssql.connect(dbConfig);

      // Check for existence in weighing_station table
      const result1 = await pool.request()
          .input('part_no', mssql.NVarChar, qrCode.part_no)
          .query(`SELECT * FROM weighing_station WHERE part_no = @part_no`);

      // Check for existence in reinspection_table
      const result2 = await pool.request()
          .input('part_no', mssql.NVarChar, qrCode.part_no)
          .query(`SELECT * FROM reinspection_table WHERE part_no = @part_no`);

      // Determine response based on results
      if (result1.recordset.length > 0 && result2.recordset.length > 0) {
          console.log("Part exists in both tables.");
          return res.json({
              isReinspection: true,
              reuseCount: result2.recordset.length,
              message: "This part exists in both tables and is marked for reinspection.",
          });
      } else if (result1.recordset.length > 0) {
          console.log("Part exists in weighing_station table only.");
          return res.json({
              isFresh: true,
              message: "This part exists in the weighing station and is marked as fresh.",
          });
      } else {
          console.log("New Part - Not found in any table.");
          return res.json({
              isNew: true,
              message: "This is a new part and does not exist in any table.",
          });
      }
  } catch (err) {
      console.error("Error validating QR code:", err);
      return res.status(500).json({ error: "Internal server error." });
  }
});




const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = "C:/SKF_Uploads/"; // External directory outside the compiled EXE
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true }); // Ensure the directory exists
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}.png`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });


app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// Fetch QC data
// Fetch QC data
app.get("/api/qc/data", async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);

    const query = `
      SELECT 
        ws.id, 
        ws.part_no, 
        ws.mo, 
        ws.box_no, 
        ws.status, 
        ws.created_at,
        CASE 
          WHEN ws.created_at IS NULL THEN 'N/A'
          WHEN DATEDIFF(MINUTE, ws.created_at, GETDATE()) >= 60 THEN 
            FORMAT(FLOOR(DATEDIFF(MINUTE, ws.created_at, GETDATE()) / 60), '00') + 'hr ' +
            FORMAT(DATEDIFF(MINUTE, ws.created_at, GETDATE()) % 60, '00') + 'min'
          ELSE CAST(DATEDIFF(MINUTE, ws.created_at, GETDATE()) AS VARCHAR) + 'min'
        END AS elapsed_time
      FROM [dbo].[weighing_station] ws
      WHERE ws.status = 'Pending';
    `;

    const result = await pool.request().query(query);

    if (!result.recordset.length) {
      return res.status(404).json({ message: "No data found" });
    }

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching QC data:", err.message);
    res.status(500).json({ error: "Error fetching data." });
  }
});


// Update QC data
app.post("/api/qc/update", upload.single("image"), async (req, res) => {
  const { part_no, mo, box_no, status, remark } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!part_no || !mo || !box_no || !status || !remark || !imagePath) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const pool = await mssql.connect(dbConfig);

    // Fetch `created_at` for elapsed time calculation
    const queryToFetchCreatedAt = `
      SELECT created_at 
      FROM [dbo].[weighing_station]
      WHERE part_no = @part_no AND mo = @mo AND box_no = @box_no;
    `;
    const createdAtResult = await pool
      .request()
      .input("part_no", mssql.NVarChar, part_no)
      .input("mo", mssql.NVarChar, mo)
      .input("box_no", mssql.NVarChar, box_no)
      .query(queryToFetchCreatedAt);

    const createdAt = createdAtResult.recordset[0]?.created_at;
    if (!createdAt) {
      return res.status(404).json({ error: "Record not found." });
    }

    const elapsedMinutes = Math.round(
      (new Date() - new Date(createdAt)) / 60000
    );
    const hours = Math.floor(elapsedMinutes / 60);
    const minutes = elapsedMinutes % 60;
    const timeElapsedFormatted = `${hours > 0 ? `${hours}hr ` : ""}${minutes}min`;

    // Insert into QC station
    const insertQuery = `
      INSERT INTO [dbo].[qc_station] 
      (part_no, mo, box_no, status, image_path, remark, updated_at, time_elapse)
      VALUES 
      (@part_no, @mo, @box_no, @status, @image_path, @remark, GETDATE(), @time_elapse);
    `;
    await pool
      .request()
      .input("part_no", mssql.NVarChar, part_no)
      .input("mo", mssql.NVarChar, mo)
      .input("box_no", mssql.NVarChar, box_no)
      .input("status", mssql.NVarChar, status)
      .input("image_path", mssql.NVarChar, imagePath)
      .input("remark", mssql.NVarChar, remark)
      .input("time_elapse", mssql.NVarChar, timeElapsedFormatted)
      .query(insertQuery);

    // Update weighing_station status
    const updateQuery = `
      UPDATE [dbo].[weighing_station]
      SET status = @status
      WHERE part_no = @part_no AND mo = @mo AND box_no = @box_no;
    `;
    await pool
      .request()
      .input("status", mssql.NVarChar, status)
      .input("part_no", mssql.NVarChar, part_no)
      .input("mo", mssql.NVarChar, mo)
      .input("box_no", mssql.NVarChar, box_no)
      .query(updateQuery);

    res.status(201).json({ message: "Quality check updated successfully." });
  } catch (err) {
    console.error("Error updating QC data:", err.message);
    res.status(500).json({ error: "Failed to update quality check." });
  }
});


// Endpoint to handle image upload
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  res.status(200).send({
    message: "Image uploaded successfully!",
    filePath: `/uploads/${req.file.filename}`,
  });
});


// *******************************************QUALITY CHECK stop*******************************************************

// ******************************************************reinspection start*******************************
// Reinspection API
app.get("/api/get-reinspection-data", async (req, res) => {
  try {
    const pool = await mssql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT qc.part_no, qc.mo, qc.box_no
      FROM [skf_digital_traceability].[dbo].[qc_station] qc
      WHERE qc.status = 'Not Ok'
      AND NOT EXISTS (
        SELECT 1
        FROM reinspection_table rt
        WHERE rt.part_no = qc.part_no AND rt.mo = qc.mo AND rt.box_no = qc.box_no
      );
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data.");
  }
});




app.post("/api/submit-reinspection", async (req, res) => {
  const { part_no, mo, box_no, checked_by } = req.body;
  try {
    const pool = await mssql.connect(dbConfig);
    await pool
      .request()
      .input("part_no", mssql.NVarChar, part_no)
      .input("mo", mssql.NVarChar, mo)
      .input("box_no", mssql.NVarChar, box_no)
      .input("checked_by", mssql.NVarChar, checked_by)
      .query(`
        INSERT INTO reinspection_table (part_no, mo, box_no, checked_by, submitted_at)
        VALUES (@part_no, @mo, @box_no, @checked_by, GETDATE());
      `);
    res.send("Data submitted successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting data.");
  }
});

// ************************************************reinspection stop*****************************************
// ****************************************************REPORT START ***********************************
app.get("/api/fetch-data", async (req, res) => {
  const { tableId, startDate, endDate } = req.query;

  // Default to today's date if not provided
  const today = new Date().toISOString().split("T")[0];
  const start = startDate || today;
  const end = endDate || today;

  let query = "";

  switch (tableId) {
    case "weighing":
      query = `
       SELECT 
  [id], [part_no], [part_description], [box_no], [date], [time],
  [channel], [quantity_per_box], [box_weight], [mo], [operator_id],
  [packing_shift], [created_at], [molding_date], [molding_shift],
  [post_curing_date], [post_curing_shift], [finishing_date], [finishing_shift],
  [no_of_boxes], [box_scan_counter], [status]
FROM [dbo].[weighing_station]
WHERE CAST([created_at] AS DATE) BETWEEN '${start}' AND '${end}';

      `;
      break;
      case "qc":
        query = `
          SELECT 
            [id], 
            [part_no], 
            [mo], 
            [box_no], 
            [status], 
            [image_path], 
            [remark], 
            [updated_at]
          FROM [dbo].[qc_station]
          WHERE CAST([updated_at] AS DATE) BETWEEN '${start}' AND '${end}';
        `;
        break;
     
    case "reinspection":
      query = `
        SELECT 
          [id], [part_no], [mo], [checked_by], [submitted_at]
        FROM [dbo].[reinspection_table]
        WHERE CAST([submitted_at] AS DATE) BETWEEN '${start}' AND '${end}';
      `;
      break;

    default:
      return res.status(400).json({ error: "Invalid tableId provided" });
  }

  try {
    const pool = await mssql.connect(dbConfig);
    const result = await pool.request().query(query);
    res.json({ tableId, data: result.recordset });
  } catch (err) {
    console.error("SQL error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ***********************************CSV START***********************************************

// async function generateCSVFiles() {
//   const tables = [
//     { name: "weighing_station", dateColumn: "created_at" },
//     { name: "qc_station", dateColumn: "updated_at" },
//     { name: "reinspection_table", dateColumn: "submitted_at" },
//   ];

//   const homeDir = require("os").homedir();
//   const skfDir = path.join(homeDir, "Music", "SKF", "CSV");

//   if (!fs.existsSync(skfDir)) {
//     fs.mkdirSync(skfDir, { recursive: true });
//   }

//   const csvDir = process.env.CSV_DIR || skfDir;

//   if (!fs.existsSync(csvDir)) {
//     fs.mkdirSync(csvDir, { recursive: true });
//   }

//   try {
//     const pool = await mssql.connect(dbConfig);

//     for (const table of tables) {
//       const filePath = path.join(csvDir, `${table.name}.csv`);

//       const query = `SELECT * FROM [dbo].[${table.name}] WHERE CAST(${table.dateColumn} AS DATE) = CAST(SYSDATETIME() AS DATE)`;
//       const result = await pool.request().query(query);

//       if (result.recordset.length > 0) {
//         const fileExists = fs.existsSync(filePath);
//         const json2csvParser = new Parser({ header: !fileExists });
//         const newCsv = json2csvParser.parse(result.recordset);

//         if (fileExists) {
//           fs.appendFileSync(filePath, `\n${newCsv}`);
//         } else {
//           fs.writeFileSync(filePath, newCsv);
//         }
//       }
//     }
//   } catch (err) {
//     console.error("Error generating CSV files:", err);
//   }
// }

// app.get("/api/export-csv", async (req, res) => {
//   try {
//     await generateCSVFiles();
//     res.status(200).json({ message: "CSV files updated successfully." });
//   } catch (err) {
//     console.error("Error updating CSV files:", err);
//     res.status(500).json({ error: "Failed to update CSV files." });
//   }
// });

// cron.schedule("0 8 * * *", () => {
//   generateCSVFiles();
// });


// Define the CSV directory path dynamically
const homeDir = os.homedir(); // Gets the user's home directory (e.g., C:\Users\Admin)
const csvDir = path.join(path.parse(homeDir).root, 'SKF', 'CSV'); // Constructs C:\SKF\CSV
console.log(`CSV files will be saved to: ${csvDir}`);

// Ensure the directory exists
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}

async function generateCSVFiles() {
  const tables = [
    { name: 'weighing_station', dateColumn: 'created_at' },
    { name: 'qc_station', dateColumn: 'updated_at' },
    { name: 'reinspection_table', dateColumn: 'submitted_at' },
  ];

  try {
    const pool = await mssql.connect(dbConfig);

    for (const table of tables) {
      const filePath = path.join(csvDir, `${table.name}.csv`);

      const query = `SELECT * FROM [dbo].[${table.name}] WHERE CAST(${table.dateColumn} AS DATE) = CAST(SYSDATETIME() AS DATE)`;
      const result = await pool.request().query(query);

      if (!result || !result.recordset) {
        throw new Error(`Invalid query result for ${table.name}`);
      }

      if (result.recordset.length > 0) {
        const fileExists = fs.existsSync(filePath);
        const json2csvParser = new Parser({ header: !fileExists });
        const newCsv = json2csvParser.parse(result.recordset);

        let retries = 5;
        while (retries > 0) {
          try {
            const release = await lockfile.lock(filePath, { retries: 0 });
            try {
              if (fileExists) {
                await fs.promises.appendFile(filePath, `\n${newCsv}`);
              } else {
                await fs.promises.writeFile(filePath, newCsv);
              }
              console.log(`Data successfully written to ${table.name}.csv`);
              break;
            } finally {
              await release();
            }
          } catch (err) {
            console.warn(`File is locked, retrying in 2 seconds... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            retries--;
          }
        }

        if (retries === 0) {
          console.error(`Could not update ${table.name}.csv after multiple attempts.`);
        }
      } else {
        console.log(`No data found for ${table.name}. Skipping file update.`);
      }
    }
  } catch (err) {
    console.error('Error generating CSV files:', err);
  }
}

// API endpoint to trigger CSV export manually
app.get('/api/export-csv', async (req, res) => {
  try {
    await generateCSVFiles();
    res.status(200).json({ message: 'CSV files updated successfully.' });
  } catch (err) {
    console.error('Error updating CSV files:', err);
    res.status(500).json({ error: 'Failed to update CSV files.' });
  }
});

// Schedule CSV generation at 8 AM
cron.schedule('0 8 * * *', () => {
  console.log('Running scheduled CSV update...');
  generateCSVFiles();
});





// ***********************************CSV STOP***********************************************
