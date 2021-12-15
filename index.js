const dotenv = require("dotenv");
dotenv.config();
const { TwitterClient } = require("twitter-api-client");
const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const BearerToken = process.env.BEARER_TOKEN;
const BASE_URL = process.env.BASE_URL;
const USER_ID = process.env.USER_ID; 

const twitterClient = new TwitterClient({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessTokenSecret: process.env.ACCESS_SECRET,
});

async function getFollowers() {
  try {
    axios.request({
      baseURL: BASE_URL,
      url: `/users/${USER_ID}/followers`,
      method: 'get',
      headers: { 'Authorization': `Bearer ${BearerToken}` },
      params: {
        max_results: 3,
        'user.fields': 'profile_image_url'
      },
    })
      .then(res => {
        let response = res.data;
        let filteredData = response.data;
        let users = filteredData.length;
        console.log("Followers data:", filteredData);
        console.log("Followers Count:", users);
        const followers = filteredData;

        const image_data = [];
        let count = 0;

        const get_followers_img = new Promise((resolve, reject) => {
          followers.forEach((user, index, arr) => {
            process_image(
              user.profile_image_url, `${user.username}.png`
            ).then(() => {
              const follower_avatar = {
                input: `${user.username}.png`,
                top: 330,
                left: parseInt(`${1100 + 120 * index}`),
                //1050
              };
              image_data.push(follower_avatar);
              count++;
              if (count === arr.length) resolve();
            });
          });
        });

        get_followers_img.then(() => {
          draw_image(image_data);
        });

      })
      .catch(err => console.log(err));

  } catch (err) {
    console.log(err);
  }
}

async function process_image(url, image_path) {
  await axios({
    url,
    responseType: "arraybuffer",
  }).then(
    (response) =>
      new Promise((resolve, reject) => {
        const rounded_corners = new Buffer.from(
          '<svg><rect x="0" y="0" width="100" height="100" rx="50" ry="50"/></svg>'
        );
        resolve(
          sharp(response.data)
            .resize(100, 100)
            .composite([
              {
                input: rounded_corners,
                blend: "dest-in",
              },
            ])
            .png()
            .toFile(image_path)
        );
      })
  );
}

async function create_text(width, height, text) {
  try {
    const svg_img = `
    <svg width="${width}" height="${height}">
    <style>
    .text {
      font-size: 48px;
      fill: #000;
      font-weight: 700;
      font-family: 'Roboto', sans-serif;
    }
    </style>
    <text x="50%" y="50%" text-anchor="middle" class="text">${text}</text>
    </svg>
    `;
    const svg_img_buffer = Buffer.from(svg_img);
    return svg_img_buffer;
  } catch (error) {
    console.log(error);
  }
}

async function draw_image(image_data) {
  try {
    const hour = new Date().getHours();
    const welcomeTypes = ["Good Morning", "Good Afternoon", "Good Evening"];
    let welcomeText = "";

    if (hour < 12) welcomeText = welcomeTypes[0];
    else if (hour < 18) welcomeText = welcomeTypes[1];
    else welcomeText = welcomeTypes[2];
    console.log(`Hour: ${hour}, Text: ${welcomeText}`);
    const svg_greeting = await create_text(500, 100, welcomeText);

    image_data.push({
      input: svg_greeting,
      top: 56,
      left: 20,
    });

    await sharp("twitter-banner.png")
      .composite(image_data)
      .toFile("new-twitter-banner.png");

    console.log("New twitter banner created");
    // upload banner to twitter
    upload_banner(image_data);
  } catch (error) {
    console.log(error);
  }
}

async function upload_banner(files) {
  try {
    const base64 = await fs.readFileSync("new-twitter-banner.png", {
      encoding: "base64",
    });
    //API V1
    await twitterClient.accountsAndUsers
      .accountUpdateProfileBanner({
        banner: base64,
      })
      .then(() => {
        console.log("Upload to Twitter done");
        delete_files(files);
      });
  } catch (error) {
    console.log(error);
  }
}

async function delete_files(files) {
  try {
    files.forEach((file) => {
      if (file.input.includes(".png")) {
        fs.unlinkSync(file.input);
        console.log("File removed");
      }
    });
  } catch (err) {
    console.error(err);
  }
}

getFollowers();
setInterval(() => {
  getFollowers();
}, 60000);