let people = require('./people.json');
const fetch = require("node-fetch");
const moment = require("moment-timezone");
let webhookUrl = require('./envs.json');
const today = moment().tz('Asia/Seoul');

const TODAYSTRING_FOR_MESSAGE = `${today.year()}년 ${today.month() + 1}월 ${today.date()}일`;
const githubUsernameArr = Object.keys(people);
webhookUrl = webhookUrl.slackWebhookUrl;

const postData = (url, data) => {
  return fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .catch(e => console.log(e));
};

const buildReminderMessage = githubUsernameArr => {
  let namesCommited = [];
  let namesNotCommited = [];
  githubUsernameArr.forEach(name => {
    let [hasCommit, timesAgo] = hasTodayCommit(name);
    if (hasCommit) {
      namesCommited.push(`<@${people[name].slack}> (${timesAgo})`);
    } else {
      namesNotCommited.push(`<@${people[name].slack}>`);
    }
  });

  return [namesCommited, namesNotCommited];
};

const hasTodayCommit = username => {
  let url = `https://api.github.com/users/${username}/events`;
  let hasCommit = false;
  let timesAgo = undefined;
  fetch(url, {
    method: 'GET'
  })
    .then(response => response.json())
    .then(responseJson => {
        let todayFirstCommit = responseJson.filter(e => {
          e.type === "PushEvent" && parseDate(e.created_at) === today.format('YYYY-MM-DD');
        })[0];

        if (todayFirstCommit !== undefined) {
          hasCommit = true;
          timesAgo = moment(todayFirstCommit.created_at).fromNow();
        }
      }
    );
  return [hasCommit, timesAgo];
};

const parseDate = dateString => moment(dateString).tz('Asia/Seoul').format('YYYY-MM-DD');

const main = () => {
  let [namesCommited, namesNotCommited] = buildReminderMessage(githubUsernameArr);
  let namesCommitedStr = (namesCommited.length === 0) ? '_한 명도 없습니다_' : namesCommited.join(', ');
  let namesNotCommitedStr = (namesNotCommited.length === 0) ? '_한 명도 없습니다_' : namesNotCommited.join(', ');

  let messageBlockReminder = {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*${TODAYSTRING_FOR_MESSAGE}* 커밋 리마인드 알림입니다🕗`
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `❗️ *아직도 커밋 안 한 게으름뱅이*\n${namesNotCommitedStr}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `💯 *커밋함! 배우신 분*\n${namesCommitedStr}`
        }
      }
    ]
  };
  postData(webhookUrl, messageBlockReminder);
};

exports.handler = function (event, context, callback) {
  setTimeout(function () {
    context.done();
    callback(null, 'Hello from Lambda');
  }, 1000);
  main();
};