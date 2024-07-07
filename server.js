const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const sharp = require("sharp");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config({
  path: path.join(__dirname, "process.env"),
});
const cors = require("cors");

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI);

// Schema and Model
// const playerSchema = new mongoose.Schema({
//   name: String,
//   role: String,
//   born: Date,
//   birthplace: String,
//   battingstyle: String,
//   bowlingstyle: String,
//   debut: Date,
//   image: String,
//   scores: {
//     runs: [String],
//     balls: [String],
//     wickets: [String],
//     lastfour: [String],
//     innings: [String],
//     career: {
//       balls: [String],
//       runs: [String],
//       wickets: [String],
//       innings: [String],
//     },
//   },
// });

const playerSchema = new mongoose.Schema({
  name: String,
  role: String,
  born: Date,
  birthplace: String,
  battingstyle: String,
  bowlingstyle: String,
  debut: Date,
  image: String,
  scores: {
    runs: [
      {
        value: String,
        DateOfMatch: Date,
      },
    ],
    balls: [
      {
        value: String,
        DateOfMatch: Date,
      },
    ],
    wickets: [
      {
        value: String,
        DateOfMatch: Date,
      },
    ],
    lastfour: [String],
    innings: [
      {
        value: String,
        DateOfMatch: Date,
      },
    ],
    career: {
      balls: [
        {
          value: String
        },
      ],
      runs: [
        {
          value: String
        },
      ],
      wickets: [
        {
          value: String
        },
      ],
      innings: [
        {
          value: String
        },
      ],
    },
  },
});

const Player = mongoose.model("Player", playerSchema);
// Enable CORS
app.use(cors());

// Middleware
app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/update", (req, res) => {
  res.sendFile(path.join(__dirname, "updatescore.html"));
});
app.get("/updateplayer", (req, res) => {
  res.sendFile(path.join(__dirname, "updateplayer.html"));
});


app.get("/api/data/:playerId", async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const player = await Player.findById(playerId).lean(); // Use .lean() for plain JavaScript object

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Compress image if available
    if (player.image) {
      const compressedImage = await compressImage(
        Buffer.from(player.image, "base64")
      );
      player.image = compressedImage || null; // Update player object with compressed image
    } else {
      player.image = null; // Handle case where image is null or empty
    }

    res.status(200).json(player);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const compressImage = async (imageBuffer) => {
  try {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Empty or undefined image buffer");
    }

    const resizedImageBuffer = await sharp(imageBuffer)
      .resize({ height: 300, width: 300 })
      .toBuffer();

    const base64Image = resizedImageBuffer.toString("base64");
    return base64Image;
  } catch (error) {
    console.error("Error compressing image:", error.message);
    return null; // Return null if there's an error with image processing
  }
};
app.get("/api/players", async (req, res) => {
  try {
    const players = await Player.find(
      {},
      {
        _id: 1,
        name: 1,
        birthplace: 1,
        born: 1,
        role: 1,
        battingstyle: 1,
        bowlingstyle: 1,
        debut: 1,
        image: 1,
        scores: 1,
      }
    );

    // Map players and compress image if available
    const playersWithCompressedImages = await Promise.all(
      players.map(async (player) => {
        if (player.image) {
          const compressedImage = await compressImage(
            Buffer.from(player.image, "base64")
          );
          return { ...player.toObject(), image: compressedImage };
        } else {
          return { ...player.toObject(), image: null }; // Handle case where image is null or empty
        }
      })
    );

    res.status(200).json(playersWithCompressedImages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/data/:playerId", async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const { runs, balls, wickets, lastfour, innings, DateOfMatch } = req.body;

    let player = await Player.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Append new elements to existing arrays
    if (runs) player.scores.runs.push(...runs.map(run => ({ value: run, DateOfMatch })));
    if (balls) player.scores.balls.push(...balls.map(ball => ({ value: ball, DateOfMatch })));
    if (wickets) player.scores.wickets.push(...wickets.map(wicket => ({ value: wicket, DateOfMatch })));
    if (lastfour) player.scores.lastfour.push(...lastfour);
    if (innings) player.scores.innings.push(...innings.map(inning => ({ value: inning, DateOfMatch })));
    if (runs) player.scores.career.runs.push(...runs.map(run => ({ value: run, DateOfMatch })));
    if (balls) player.scores.career.balls.push(...balls.map(ball => ({ value: ball, DateOfMatch })));
    if (wickets) player.scores.career.wickets.push(...wickets.map(wicket => ({ value: wicket, DateOfMatch })));
    if (innings) player.scores.career.innings.push(...innings.map(inning => ({ value: inning, DateOfMatch })));

    await player.save();

    res.status(200).json({ message: "Data updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// app.post("/api/data", async (req, res) => {
//   try {
//     const {
//       name,
//       role,
//       born,
//       birthplace,
//       battingstyle,
//       bowlingstyle,
//       debut,
//       image,
//       scores
//     } = req.body;
    
//     // Create new player with scores included
//     const newPlayer = new Player({
//       name: name,
//       role: role,
//       born: born,
//       birthplace: birthplace,
//       battingstyle: battingstyle,
//       bowlingstyle: bowlingstyle,
//       debut: debut,
//       image: image,
//       scores: scores || {
//         runs: [],
//         balls: [],
//         wickets: [],
//         lastfour: [],
//         innings: [],
//         career: {
//           balls: [],
//           runs: [],
//           wickets: [],
//           innings: []
//         },
//       }
//     });

//     // Save the new player
//     await newPlayer.save();

//     res.status(200).json({ message: "Player added successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });


app.post("/api/data", async (req, res) => {
  try {
    const {
      name,
      role,
      born,
      birthplace,
      battingstyle,
      bowlingstyle,
      debut,
      image,
      scores
    } = req.body;

    // Create new player
    const newPlayer = new Player({
      name,
      role,
      born: new Date(born), // Convert to Date object
      birthplace,
      battingstyle,
      bowlingstyle,
      debut: new Date(debut), // Convert to Date object
      image,
      scores: {
        runs: scores.runs.map(score => ({
          value: score.value,
          DateOfMatch: new Date(score.DateOfMatch)
        })),
        balls: scores.balls.map(score => ({
          value: score.value,
          DateOfMatch: new Date(score.DateOfMatch)
        })),
        wickets: scores.wickets.map(score => ({
          value: score.value,
          DateOfMatch: new Date(score.DateOfMatch)
        })),
        lastfour: scores.lastfour,
        innings: scores.innings.map(score => ({
          value: score.value,
          DateOfMatch: new Date(score.DateOfMatch)
        })),
        career: {
          balls: [{ value: "0" }], // Initial career values, adjust as needed
          runs: [{ value: "0" }],
          wickets: [{ value: "0" }],
          innings: [{ value: "0" }]
        }
      }
    });

    // Save the new player
    await newPlayer.save();

    res.status(200).json({ message: "Player added successfully", player: newPlayer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
//Delete All
app.delete("/api/data/all", async (req, res) => {
  try {
    await Player.deleteMany({}); // Delete all players from the collection
    res.status(200).json({ message: "All players deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
//De;ete By Id
app.delete("/api/data/:playerId", async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const player = await Player.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    await player.remove();
    res.status(200).json({ message: "Player deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update Profile Picture

// Update player image route
app.put('/api/players/image/:id', async (req, res) => {
  const playerId = req.params.id;
  const { image } = req.body;

  try {
    const player = await Player.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Update only the image field
    player.image = image;

    // Save the updated player
    await player.save();

    res.json({ message: 'Player image updated successfully', player });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update score card
// app.put("/api/scorecard/:playerId", async (req, res) => {
//   const playerId = req.params.playerId;
//   const { scores } = req.body;

//   try {
//     let player = await Player.findById(playerId);

//     if (!player) {
//       return res.status(404).json({ message: "Player not found" });
//     }

//     // Update runs, balls, and wickets arrays if they exist in the request body
//     if (scores.runs && scores.runs.length > 0) {
//       scores.runs.forEach(score => {
//         player.scores.runs.push({
//           value: score.value,
//           DateOfMatch: score.DateOfMatch
//         });
//       });
//       updateCareerRuns(player); // Update career runs after pushing new runs
//       updateLastFour(player, scores.runs); // Update last four runs
//     }

//     if (scores.balls && scores.balls.length > 0) {
//       scores.balls.forEach(score => {
//         player.scores.balls.push({
//           value: score.value,
//           DateOfMatch: score.DateOfMatch
//         });
//       });
//       updateCareerBalls(player); // Update career balls after pushing new balls
//     }

//     if (scores.wickets && scores.wickets.length > 0) {
//       scores.wickets.forEach(score => {
//         player.scores.wickets.push({
//           value: score.value,
//           DateOfMatch: score.DateOfMatch
//         });
//       });
//       updateCareerWickets(player); // Update career wickets after pushing new wickets
//     }

//     await player.save(); // Save the updated player document

//     res.status(200).json({ message: "Scores updated successfully", player });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

// // Function to update career runs
// function updateCareerRuns(player) {
//   player.scores.career.runs.value = player.scores.runs.reduce((total, run) => total + parseInt(run.value), 0).toString();
// }

// // Function to update career balls
// function updateCareerBalls(player) {
//   player.scores.career.balls.value = player.scores.balls.reduce((total, ball) => total + parseInt(ball.value), 0).toString();
// }

// // Function to update career wickets
// function updateCareerWickets(player) {
//   player.scores.career.wickets.value = player.scores.wickets.reduce((total, wicket) => total + parseInt(wicket.value), 0).toString();
// }

// // Function to update last four runs
// function updateLastFour(player, newRuns) {
//   const currentLastFour = player.scores.lastfour;

//   if (currentLastFour.length >= 4) {
//     // Remove oldest entry
//     currentLastFour.shift();
//   }

//   // Add new runs value to last four
//   const runsSum = newRuns.reduce((total, run) => total + parseInt(run.value), 0);
//   currentLastFour.push(runsSum.toString());

//   player.scores.lastfour = currentLastFour;
// }

//Update scores endpoint
app.put('/api/scorecard/:playerId', async (req, res) => {
  const playerId = req.params.playerId;
  const { scores } = req.body;

  try {
    let player = await Player.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    if (scores.runs && scores.runs.length > 0) {
      scores.runs.forEach(score => {
        player.scores.runs.push({
          value: score.value,
          DateOfMatch: score.DateOfMatch,
        });
      });
      updateCareerRuns(player);
      updateLastFour(player, scores.runs);
      player.markModified('scores.runs');
    }

    if (scores.balls && scores.balls.length > 0) {
      scores.balls.forEach(score => {
        player.scores.balls.push({
          value: score.value,
          DateOfMatch: score.DateOfMatch,
        });
      });
      updateCareerBalls(player);
      player.markModified('scores.balls');
    }

    if (scores.wickets && scores.wickets.length > 0) {
      scores.wickets.forEach(score => {
        player.scores.wickets.push({
          value: score.value,
          DateOfMatch: score.DateOfMatch,
        });
      });
      updateCareerWickets(player);
      player.markModified('scores.wickets');
    }

    await player.save();

    res.status(200).json({ message: 'Scores updated successfully', player });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Function to update career runs
function updateCareerRuns(player) {
  const totalRuns = player.scores.runs.reduce((total, run) => total + parseInt(run.value), 0);
  player.scores.career.runs[0].value = totalRuns.toString();
}

// Function to update career balls
function updateCareerBalls(player) {
  const totalBalls = player.scores.balls.reduce((total, ball) => total + parseInt(ball.value), 0);
  player.scores.career.balls[0].value = totalBalls.toString();
}

// Function to update career wickets
function updateCareerWickets(player) {
  const totalWickets = player.scores.wickets.reduce((total, wicket) => total + parseInt(wicket.value), 0);
  player.scores.career.wickets[0].value = totalWickets.toString();
}

// Function to update last four runs
// function updateLastFour(player, newRuns) {
//   const currentLastFour = player.scores.lastfour;

//   if (currentLastFour.length >= 4) {
//     //currentLastFour.shift(); // Remove oldest entry
//     player.scores.lastfour = [];
//     player.scores.lastfour.push(newRuns);
//   }else{
//     player.scores.lastfour.push(newRuns);
//   }

//   // const runsSum = newRuns.reduce((total, run) => total + parseInt(run.value), 0);
//   // currentLastFour.push(runsSum.toString());

//   player.scores.lastfour = currentLastFour;
// }

function updateLastFour(player, newRuns) {
  const currentLastFour = player.scores.lastfour;

  // Calculate sum of new runs
  const runsSum = newRuns.reduce((total, run) => total + parseInt(run.value), 0);

  // Reset lastfour if it already has 4 entries, otherwise add the new sum
  if (currentLastFour.length === 4) {
    player.scores.lastfour = [runsSum.toString()];
  } else {
    player.scores.lastfour.push(runsSum.toString());
  }

  // Ensure lastfour does not exceed 4 entries
  if (player.scores.lastfour.length > 4) {
    player.scores.lastfour = player.scores.lastfour.slice(-4); // Keep only the last 4 entries
  }
}
//Man of The Match

app.get('/api/mom/:date', async (req, res) => {
  const date = new Date(req.params.date);

  try {
    const players = await Player.find({
      $or: [
        { 'scores.runs.DateOfMatch': date },
        { 'scores.wickets.DateOfMatch': date }
      ]
    });

    let motmPlayer = null;
    let highestScore = 0;

    players.forEach(player => {
      let playerScore = 0;
      player.scores.runs.forEach(run => {
        if (run.DateOfMatch.getTime() === date.getTime()) {
          playerScore += parseInt(run.value, 10);
        }
      });

      player.scores.wickets.forEach(wicket => {
        if (wicket.DateOfMatch.getTime() === date.getTime()) {
          playerScore += 10 * parseInt(wicket.value, 10);
        }
      });

      if (playerScore > highestScore) {
        highestScore = playerScore;
        motmPlayer = player;
      }
    });

    if (!motmPlayer) {
      return res.status(404).json({ message: 'No matches found on this date' });
    }

    if (motmPlayer.image) {
      const compressedImage = await compressImage(Buffer.from(motmPlayer.image, 'base64'));
      motmPlayer.image = compressedImage || null;
    } else {
      motmPlayer.image = null;
    }

    res.status(200).json(motmPlayer);
  } catch (error) {
    console.error('Error fetching MOTM:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

///update player details
app.put("/api/update/:playerId", async (req, res) => {
  try {
    const playerId = req.params.playerId;
    const {
      name,
      role,
      born,
      birthplace,
      battingstyle,
      bowlingstyle,
      debut,
      image,
    } = req.body;

    let player = await Player.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Update specific fields
    if (name) player.name = name;
    if (role) player.role = role;
    if (born) player.born = born;
    if (birthplace) player.birthplace = birthplace;
    if (battingstyle) player.battingstyle = battingstyle;
    if (bowlingstyle) player.bowlingstyle = bowlingstyle;
    if (debut) player.debut = debut;
    if (image) player.image = image;

    await player.save();

    res.status(200).json({ message: "Player details updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
