'use strict';

const BASE_API_URL = 'https://opentdb.com';
const TOP_LEVEL_COMPONENTS = [
  'js-intro', 'js-question', 'js-question-feedback', 
  'js-outro', 'js-quiz-status'
];

let QUESTIONS = [];
// token is global because store is reset between quiz games, but token should persist for 
// entire session

let sessionToken;

const store = {
  page: 'intro',
  currentQuestionIndex: null,
  userAnswers: [],
  feedback: null,
  sessionToken,
  totalQuestions: 0,
  nextQuestion: function(){
    if (this.currentQuestionIndex <= this.totalQuestions) return;
    this.currentQuestionIndex++;
  },
  checkstatus: function(){
    if (this.currentQuestionIndex === this.totalQuestions-1) {  //index is 4, current is question 5 
      this.page = 'outro';
      render();
    } else if (this.currentQuestionIndex > 0  && (this.currentQuestionIndex < this.totalQuestions-1) ){
      this.page = 'question';
      render();
    } else {
      render();
    }
  }
}; 

// const getInitialStore = function(){
//   return {
//     page: 'intro',
//     currentQuestionIndex: null,
//     userAnswers: [],
//     feedback: null,
//     sessionToken,
//   };
// };

//let store = getInitialStore();

// Helper functions START =========
const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
};

const buildBaseUrl = function(amt = 10, query = {}) {
  const url = new URL(BASE_API_URL + '/api.php');
  const queryKeys = Object.keys(query);
  url.searchParams.set('amount', amt);

  if (store.sessionToken) {
    url.searchParams.set('token', store.sessionToken);
  }

  queryKeys.forEach(key => url.searchParams.set(key, query[key]));
  return url;
};

const buildTokenUrl = function() {
  return new URL(BASE_API_URL + '/api_token.php');
};


const createQuestion = function(question) {
  return {
    text: question.question,
    answers: [ ...question.incorrect_answers, question.correct_answer ],
    correctAnswer: question.correct_answer
  };
};
// Helper functions END =========



//API Calls/Functions START =========
const fetchToken = function(callback) {
  if (sessionToken) {
    return callback();
  }

  const url = buildTokenUrl();
  url.searchParams.set('command', 'request');

  $.getJSON(url, res => {
    sessionToken = res.token;
    callback();
  }, err => console.log(err));
};

const fetchQuestions = function(amt, query, callback) {
  $.getJSON(buildBaseUrl(amt, query), callback, err => console.log(err.message));
};

const seedQuestions = function(questions) {
  QUESTIONS.length = 0;
  questions.forEach(q => QUESTIONS.push(createQuestion(q)));
};

const fetchAndSeedQuestions = function(amt, query, callback) {
  fetchQuestions(amt, query, res => {
    seedQuestions(res.results);
    callback();
  });
};
//API Calls/Functions END =========


//Question Status/ functions START =========
const getProgress = function() {
  return {
    current: store.currentQuestionIndex + 1,
    total: QUESTIONS.length
  };
};

const getCurrentQuestion = function() {
  return QUESTIONS[store.currentQuestionIndex];
};

const getQuestion = function(index) {
  return QUESTIONS[index];
};

const getScore = function() {
  return store.userAnswers.reduce((accumulator, userAnswer, index) => {
    const question = getQuestion(index);

    if (question.correctAnswer === userAnswer) {
      return accumulator + 1;
    } else {
      return accumulator;
    }
  }, 0);
};
//Question Status functions END =========



// HTML generator functions START =========
const generateAnswerItemHtml = function(answer) {
  return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  const answers = question.answers
    .map((answer, index) => generateAnswerItemHtml(answer, index))
    .join('');

  return `
    <form>
      <fieldset>
        <legend class="question-text">${question.text}</legend>
          ${answers}
          <button type="submit">Submit</button>
      </fieldset>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>
      ${feedback}
    </p>
    <button class="continue js-continue">Continue</button>
  `;
};
// HTML generator functions END =========

//Handler Functions START =========
const handleStartQuiz = function() {
  // store = getInitialStore();
  store.page = 'question';
  store.currentQuestionIndex = 0;
  const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
  fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
    store.totalQuestions = quantity;
    store.checkstatus();
  });
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getCurrentQuestion();
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);
  
  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
  }

  store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUESTIONS.length - 1) {
    store.page = 'outro';
    render();
    return;
  }

  store.currentQuestionIndex++;
  store.page = 'question';
  render();
};
//Handler Functions END =========


//Render Functions
const render = function() {
  let html;
  hideAll();

  const question = getCurrentQuestion();
  const { feedback } = store; 
  const { current, total } = getProgress();

  $('.js-score').html(`<span>Score: ${getScore()}</span>`);
  $('.js-progress').html(`<span>Question ${current} of ${total}`);

  switch (store.page) {
  case 'intro':
    $('.js-intro').show();
    break;
    
  case 'question':
    html = generateQuestionHtml(question);
    $('.js-question').html(html);
    $('.js-question').show();
    $('.quiz-status').show();
    break;

  case 'answer':
    html = generateFeedbackHtml(feedback);
    $('.js-question-feedback').html(html);
    $('.js-question-feedback').show();
    $('.quiz-status').show();
    break;

  case 'outro':
    $('.js-outro').show();
    $('.quiz-status').show();
    break;

  default:
    return;
  }
};

$(() => {
  // Run first render
  render();

  // Fetch session token, enable Start button when complete
  fetchToken(() => {
    $('.js-start').attr('disabled', false);
  });

  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
});
  
