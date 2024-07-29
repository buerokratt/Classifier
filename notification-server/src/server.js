const express = require("express");
const cors = require("cors");
const { buildSSEResponse } = require("./sseUtil");
const { serverConfig } = require("./config");
const { buildNotificationSearchInterval } = require("./addOns");
const { updateProgress } = require("./openSearch");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const csurf = require("csurf");

const app = express();

app.use(cors());
app.use(helmet.hidePoweredBy());
app.use(express.json({ extended: false }));
app.use(cookieParser());
app.use(csurf({ cookie: true }));

app.get("/sse/notifications/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  console.log(`session id: ${sessionId}`);
  buildSSEResponse({
    req,
    res,
    buildCallbackFunction: buildNotificationSearchInterval({ sessionId }),
  });
});

app.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Endpoint to update the dataset_group_progress index
app.post("/dataset-group/update-progress", async (req, res) => {
  const { sessionId, progress } = req.body;

  if (!sessionId || progress === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await updateProgress(sessionId, progress);
    res.status(201).json({ message: "Document created successfully" });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

const server = app.listen(serverConfig.port, () => {
  console.log(`Server running on port ${serverConfig.port}`);
});

module.exports = server;
