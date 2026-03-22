// src/routes/ipfs.js
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const auth    = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

async function pinToIPFS(formData, headers) {
  const axios = require("axios");
  return axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    formData,
    { headers: { ...formData.getHeaders(), ...headers } }
  );
}

// POST /api/ipfs/file
router.post("/file", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const PINATA_API_KEY    = process.env.PINATA_API_KEY;
    const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

    if (!PINATA_API_KEY || PINATA_API_KEY.startsWith("your_")) {
      const dummyCid = "QmDummy" + Date.now();
      return res.json({
        cid: dummyCid,
        url: `https://gateway.pinata.cloud/ipfs/${dummyCid}`,
        note: "Pinata not configured — dummy CID returned",
      });
    }

    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await pinToIPFS(formData, {
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    });

    const cid = response.data.IpfsHash;
    res.json({ cid, url: `${process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/"}${cid}` });
  } catch (err) {
    console.error("IPFS upload error:", err.message);
    res.status(500).json({ message: "IPFS upload failed" });
  }
});

// POST /api/ipfs/json
router.post("/json", auth, async (req, res) => {
  try {
    const PINATA_API_KEY    = process.env.PINATA_API_KEY;
    const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

    if (!PINATA_API_KEY || PINATA_API_KEY.startsWith("your_")) {
      const dummyCid = "QmDummyJson" + Date.now();
      return res.json({
        cid: dummyCid,
        url: `https://gateway.pinata.cloud/ipfs/${dummyCid}`,
        note: "Pinata not configured — dummy CID returned",
      });
    }

    const axios = require("axios");
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      req.body,
      {
        headers: {
          "Content-Type":        "application/json",
          pinata_api_key:        PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    const cid = response.data.IpfsHash;
    res.json({ cid, url: `${process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/"}${cid}` });
  } catch (err) {
    console.error("IPFS JSON upload error:", err.message);
    res.status(500).json({ message: "IPFS JSON upload failed" });
  }
});

module.exports = router;
