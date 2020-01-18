let people = require('./people.json');
const fetch = require("node-fetch");
const moment = require("moment-timezone");
let webhookUrl = require('./envs.json');
// const today = moment().tz('Asia/Seoul');
const yesterday = moment().tz('Asia/Seoul').subtract(1, 'day');

const YESTERDAY_STRING_FOR_MESSAGE = `${yesterday.year()}년 ${yesterday.month() + 1}월 ${yesterday.date()}일`;
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
      // namesCommited.push(`<@${people[name].slack}> (${timesAgo})`);
      namesCommited.push(`${people[name].name} (${timesAgo})`);   // not mentioning
    } else {
      // namesNotCommited.push(`<@${people[name].slack}>`);
      namesNotCommited.push(`${people[name].name} (${timesAgo})`);
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
  }).then(response => response.json())
    .then(responseJson => {
        let todayFirstCommit = responseJson.filter(e => {
          e.type === "PushEvent" && parseDate(e.created_at) === yesterday.format('YYYY-MM-DD');
        })[0];

        if (todayFirstCommit !== undefined) {
          hasCommit = true;
          timesAgo = moment(todayFirstCommit.created_at).tz('Asia/Seoul').fromNow();
        }
      }
    );
  return [hasCommit, timesAgo];
};

const parseDate = dateString => moment(dateString).tz('Asia/Seoul').format('YYYY-MM-DD');

const main = () => {
  let [namesCommited, namesNotCommited] = buildReminderMessage(githubUsernameArr);
  let namesCommitedStr = (namesCommited.length === 0) ? '한 명도 없습니다.' : namesCommited.join(', ');
  let namesNotCommitedStr = (namesNotCommited.length === 0) ? '한 명도 없습니다.' : namesNotCommited.join(', ');
  let successMessage = namesCommited.length === 0 ? '아무도 성공하지 않았습니다😭' : '총 ${namesCommited.length}명이 성공했습니다!🎉';

  let messageBlockReminder = {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*${YESTERDAY_STRING_FOR_MESSAGE}* 오늘 일일 커밋 결과입니다📢`
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `❌ *커밋 실패!*\n${namesNotCommitedStr}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `✅ *커밋 성공!*\n${namesCommitedStr}`
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `_${successMessage}_`
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
  return main();
};