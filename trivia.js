'use strict';


const readline = require('readline');

// ---------- Configuration ----------
const QUESTION_TIME_LIMIT_SEC = 15; // time allowed per question
const GAME_TIME_LIMIT_SEC = 90;     // time allowed for the whole game
const LETTERS = ['A', 'B', 'C', 'D'];

// ---------- Data (array of objects) ----------
const questions = [
  {
    text: 'Which keyword declares a block-scoped variable in JavaScript?',
    choices: ['var', 'let', 'define', 'dim'],
    answer: 'B',
  },
  {
    text: 'Which array method returns a new array of items that pass a test?',
    choices: ['map', 'reduce', 'filter', 'forEach'],
    answer: 'C',
  },
  {
    text: 'What does JSON stand for?',
    choices: [
      'JavaScript Object Notation',
      'Java Standard Object Naming',
      'JavaScript Online Network',
      'Joined Script Object Node',
    ],
    answer: 'A',
  },
  {
    text: 'Which function runs code once after a delay?',
    choices: ['setInterval', 'setTimeout', 'delay', 'wait'],
    answer: 'B',
  },
  {
    text: 'What is the result of typeof []?',
    choices: ['array', 'list', 'object', 'undefined'],
    answer: 'C',
  },
];



/**
 * Formats a question and its choices for display.
 * @param {{text: string, choices: string[]}} question
 * @param {number} number - 1-based question number
 * @returns {string} printable text
 */
function formatQuestion(question, number) {
  const choiceLines = question.choices.map(
    (choice, i) => `  ${LETTERS[i]}) ${choice}`
  );
  return [`\nQuestion ${number}: ${question.text}`, ...choiceLines].join('\n');
}

/**
 * Asks a question on the CLI but gives up after a time limit.
 * @param {readline.Interface} rl
 * @param {string} prompt
 * @param {number} seconds - time limit
 * @returns {Promise<string|null>} trimmed answer, or null if time ran out
 */
function askWithTimeout(rl, prompt, seconds) {
  return new Promise((resolve) => {
    const controller = new AbortController();

    // Async timers: a warning 5s before the limit, and the cutoff itself
    const warning = seconds > 5
      ? setTimeout(() => console.log('\n  ⏱  5 seconds left!'), (seconds - 5) * 1000)
      : null;
    const cutoff = setTimeout(() => controller.abort(), seconds * 1000);

    controller.signal.addEventListener(
      'abort',
      () => {
        clearTimeout(warning);
        resolve(null);
      },
      { once: true }
    );

    rl.question(prompt, { signal: controller.signal }, (answer) => {
      clearTimeout(warning);
      clearTimeout(cutoff);
      resolve(answer.trim());
    });
  });
}

/**
 * Checks an answer and returns a result record.
 * @param {object} question
 * @param {string|null} input - user's raw input, or null on timeout
 * @returns {{question: string, correct: boolean, timedOut: boolean}}
 */
function evaluateAnswer(question, input) {
  if (input === null) {
    return { question: question.text, correct: false, timedOut: true };
  }
  const correct = input.toUpperCase() === question.answer;
  return { question: question.text, correct, timedOut: false };
}

/**
 * Prints the final score summary using filter and reduce.
 * @param {Array<{correct: boolean, timedOut: boolean}>} results
 * @param {number} totalQuestions
 */
function showSummary(results, totalQuestions) {
  const score = results.reduce((total, r) => total + (r.correct ? 1 : 0), 0);
  const timedOut = results.filter((r) => r.timedOut).length;
  const unanswered = totalQuestions - results.length;
  const percent = Math.round((score / totalQuestions) * 100);

  console.log('\n==============================');
  console.log('        GAME OVER');
  console.log('==============================');
  console.log(`Score:          ${score}/${totalQuestions} (${percent}%)`);
  console.log(`Timed out:      ${timedOut}`);
  console.log(`Not reached:    ${unanswered}`);

  if (percent === 100) console.log('Perfect score! 🏆');
  else if (percent >= 60) console.log('Nice work! 👍');
  else console.log('Keep practicing, you will get there!');
}



async function playGame() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('=== CLI TRIVIA ===');
    console.log(
      `${questions.length} questions | ${QUESTION_TIME_LIMIT_SEC}s per question | ${GAME_TIME_LIMIT_SEC}s total`
    );
    const start = await askWithTimeout(rl, 'Press Enter to start (or type q to quit): ', 60);
    if (start === null || start.toLowerCase() === 'q') {
      console.log('Goodbye!');
      return;
    }

    const gameDeadline = Date.now() + GAME_TIME_LIMIT_SEC * 1000;
    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const secondsLeftInGame = Math.floor((gameDeadline - Date.now()) / 1000);
      if (secondsLeftInGame <= 0) {
        console.log("\n⏰ Time's up for the whole game!");
        break;
      }

      // Per-question limit can never exceed the remaining game time
      const limit = Math.min(QUESTION_TIME_LIMIT_SEC, secondsLeftInGame);
      console.log(formatQuestion(questions[i], i + 1));
      console.log(`  (${limit}s to answer | ${secondsLeftInGame}s left in game)`);

      const input = await askWithTimeout(rl, 'Your answer (A-D): ', limit);

      // Error handling: reject invalid input but count it as incorrect
      if (input !== null && !LETTERS.includes(input.toUpperCase())) {
        console.log('  ⚠️  Invalid choice, counted as incorrect.');
      }

      const result = evaluateAnswer(questions[i], input);
      results.push(result);

      if (result.timedOut) {
        console.log(`\n⏰ Time's up! The answer was ${questions[i].answer}.`);
      } else if (result.correct) {
        console.log('\n✅ Correct!');
      } else {
        console.log(`\n❌ Incorrect. The answer was ${questions[i].answer}.`);
      }
    }

    showSummary(results, questions.length);
  } catch (error) {
    console.error('Something went wrong:', error.message);
  } finally {
    rl.close();
  }
}

playGame();