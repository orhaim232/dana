function toggleNav() {
    var nav = document.getElementById("main-nav");
    if (!nav) return;
    nav.classList.toggle("hide-mobile");
}

var form;
var interactionsBatch = [];
var isScormConnected = false;

/* SCORM */
function scormInit() {
    if (isScormConnected) {
        return true;
    }

    if (!window.pipwerks || !pipwerks.SCORM) {
        console.warn("[SCORM] Wrapper not found.");
        isScormConnected = false;
        return false;
    }

    var ok = pipwerks.SCORM.init();
    if (!ok) {
        console.error("[SCORM] init() failed.");
        isScormConnected = false;
        return false;
    }

    isScormConnected = true;
    return true;
}

function scormGet(key) {
    if (!isScormConnected) return "";
    var v = pipwerks.SCORM.get(key);
    return v ? v : "";
}

function scormSet(key, value) {
    if (!isScormConnected) return;
    pipwerks.SCORM.set(key, String(value));
}

function scormSave() {
    if (!isScormConnected) return;
    pipwerks.SCORM.save();
}

function scormQuit() {
    if (!isScormConnected) return;
    pipwerks.SCORM.save();
    pipwerks.SCORM.quit();
    isScormConnected = false;
}

function scormTrackBase(status, location, suspendData) {
    if (!isScormConnected) return;

    if (status) scormSet("cmi.core.lesson_status", status);
    if (location) scormSet("cmi.core.lesson_location", location);
    if (suspendData) scormSet("cmi.suspend_data", suspendData);

    scormSave();
}

/* פונקציה לעדכון מיקום (SCORM cmi.core.lesson_location) */
function setLocation(loc) {
    console.log("[Location] Updating to:", loc);

    if (!isScormConnected) {
        console.warn("[Location] SCORM is not connected. Skipping save.");
        return;
    }
    // עדכון המיקום
    scormSet("cmi.core.lesson_location", loc);
    // שמירה (Commit)
    scormSave();
}

function scormTrackSearch() {
    if (!isScormConnected) return;

    var input = document.getElementById("searchInput");
    var q = "";
    if (input) q = (input.value || "").trim();

    scormSet("cmi.core.lesson_location", "search");
    scormSet("cmi.suspend_data", "search_query=" + encodeURIComponent(q));
    scormSave();
}

function fetchLearnerData() {
    var nameEl = document.getElementById("learner-name");
    if (!nameEl) return;

    if (!isScormConnected) {
        nameEl.textContent = "LMS לא מחובר";
        return;
    }

    var learnerName = scormGet("cmi.core.student_name");
    if (learnerName) {
        nameEl.textContent = learnerName;
    } else {
        nameEl.textContent = "לא זוהה שם משתמש";
    }
}

window.addEventListener("beforeunload", function () {
    scormSave();
});

/* UI helpers */
function setCheckDisabled(disabled) {
    var btn = document.getElementById("btn-check");
    if (btn) btn.disabled = disabled;
}

function setFinalizeDisabled(disabled) {
    var btn = document.getElementById("btn-finalize");
    if (btn) btn.disabled = disabled;
}

/* פונקציה לנעילה או שחרור של כפתור הניקוי */
function setResetDisabled(disabled) {
    var btn = document.getElementById("btn-reset");
    if (btn) btn.disabled = disabled;
}

/* פונקציה לנעילה או שחרור של כל השדות בטופס */
function setFormInputsDisabled(status) {
    if (!form) return;

    // מעבר על כל האלמנטים בטופס
    for (var i = 0; i < form.elements.length; i++) {
        var el = form.elements[i];
        // אנו רוצים לנעול רק שדות קלט (רדיו, טקסט), לא כפתורים
        if (el.tagName === "BUTTON") continue;

        el.disabled = status;
    }
}

/* חדש: שליטה ב"הצגת בלוק ההגשה" */
function setFinalizeBlockVisible(visible) {
    var btn = document.getElementById("btn-finalize");
    var msg = document.getElementById("finalize-msg");
    var instructionText = document.getElementById("finalize-instruction-text");

    if (btn) btn.style.display = visible ? "inline-block" : "none";
    if (msg) msg.style.display = visible ? "inline-block" : "none";

    // אם הכפתור מוצג (visible=true), נסתיר את הטקסט. אחרת נציג אותו.
    if (instructionText) {
        instructionText.style.display = visible ? "none" : "block";
    }
}

function clearFinalizeMessage() {
    var msg = document.getElementById("finalize-msg");
    if (msg) {
        msg.textContent = "";
        msg.classList.remove("success-msg");
    }
}

/* DOM READY */
document.addEventListener("DOMContentLoaded", function () {

    /* חיפוש */
    var searchInput = document.getElementById("searchInput");
    var searchButton = document.getElementById("searchButton");
    var clearSearchButton = document.getElementById("clearSearchButton");

    var unitsList = document.getElementById("unitsList");
    var unitsItems = [];
    if (unitsList) {
        unitsItems = unitsList.getElementsByTagName("li");
    }

    function filterUnits() {
        var query = "";
        if (searchInput) query = searchInput.value.toLowerCase().trim();

        var searchError = document.getElementById("searchError");
        if (searchError) searchError.textContent = "";

        if (!unitsItems || unitsItems.length === 0) return;

        var visibleCount = 0;

        for (var i = 0; i < unitsItems.length; i++) {
            var li = unitsItems[i];
            var titleSpan = li.getElementsByClassName("unit-title")[0];
            var textSpan = li.getElementsByClassName("unit-text")[0];

            var fullText = "";
            if (titleSpan) fullText += titleSpan.textContent.toLowerCase();
            if (textSpan) fullText += " " + textSpan.textContent.toLowerCase();

            if (query === "") {
                li.classList.remove("hide");
                visibleCount++;
            } else {
                if (fullText.indexOf(query) !== -1) {
                    li.classList.remove("hide");
                    visibleCount++;
                } else {
                    li.classList.add("hide");
                }
            }
        }

        if (query !== "" && visibleCount === 0 && searchError) {
            searchError.textContent = "לא נמצאו תוצאות לחיפוש";
        }
    }

    function clearSearch() {
        if (searchInput) searchInput.value = "";

        var searchError = document.getElementById("searchError");
        if (searchError) searchError.textContent = "";

        filterUnits();

        if (searchInput) searchInput.focus();
    }

    if (searchButton) {
        searchButton.addEventListener("click", function () {
            filterUnits();
            scormTrackSearch();
        });
    }

    if (clearSearchButton) {
        clearSearchButton.addEventListener("click", function () {
            clearSearch();
            scormTrackSearch();
        });
    }

    if (searchInput) {
        // 기존: Enter לחיפוש
        searchInput.addEventListener("keyup", function (event) {
            if (event.key === "Enter") {
                filterUnits();
                scormTrackSearch();
            }
        });

        // חדש: חיפוש חי (Live Search) בעת הקלדה
        searchInput.addEventListener("input", function () {
            filterUnits();
        });
    }

    /* מבחן */
    form = document.getElementById("quiz-form");

    var btnCheck = document.getElementById("btn-check");
    var btnFinalize = document.getElementById("btn-finalize");
    var btnReset = document.getElementById("btn-reset");

    if (btnCheck) btnCheck.addEventListener("click", handleQuizSubmit);
    if (btnFinalize) btnFinalize.addEventListener("click", finalizeAndCloseLMSConnection);
    if (btnReset) btnReset.addEventListener("click", resetQuizForm);

    /* חדש: בהתחלה להסתיר את בלוק ההגשה */
    setFinalizeBlockVisible(false);
    clearFinalizeMessage();

    /* חדש: כפתור ניקוי מתחיל במצב לא פעיל */
    setResetDisabled(true);

    // האזנה לשינויים בטופס כדי להפעיל את כפתור הניקוי ברגע שמשתמש עונה
    if (form) {
        form.addEventListener("change", function () {
            setResetDisabled(false);
        });
        form.addEventListener("input", function () {
            setResetDisabled(false);
        });
    }

    /* SCORM */
    if (scormInit()) {
        // עדכון ראשוני: רק אם המיקום ריק, נקבע אותו כ-"home".
        // אחרת (לדוגמה אם המשתמש יצא וחזר), נשמור על המיקום האחרון.
        var savedLoc = scormGet("cmi.core.lesson_location");
        if (!savedLoc || savedLoc === "") {
            scormTrackBase("incomplete", "home", "page_loaded=1");
        }

        fetchLearnerData();

        /* הגדרת מיקומים (Location) בנקודות משמעותיות */

        // חיפוש
        if (searchInput) {
            searchInput.addEventListener("focus", function () {
                setLocation("search");
            });
        }

        // אזור השאלון (כללי)
        if (form) {
            form.addEventListener("mouseenter", function () {
                setLocation("quiz");
            });

            // הוספה: גם בכניסה עם מקלדת (TAB) לשדות הטופס נעדכן ל-"quiz"
            form.addEventListener("focusin", function () {
                setLocation("quiz");
            });
        }
    }
});

/* ניקוי מצבי שגיאה */
function clearInlineErrors() {
    if (!form) return;

    var quizError = document.getElementById("quizError");
    if (quizError) quizError.textContent = "";

    var questions = form.querySelectorAll(".question");
    for (var i = 0; i < questions.length; i++) {
        questions[i].classList.remove("error");

        var msg = questions[i].querySelector(".error-msg");
        if (msg) msg.textContent = "";

        var area = questions[i].querySelector("[data-answer-area]");
        if (area) area.classList.remove("error");
    }

    var q3 = document.getElementById("q3");
    if (q3) q3.classList.remove("input-error");
}

/* ולידציה ללא פופ אפ */
function validateQuizInline() {
    if (!form) return false;

    clearInlineErrors();

    var hasErrors = false;

    function markQuestionError(questionNameOrId, message) {
        var questionArticle = null;

        if (questionNameOrId === "q1") {
            questionArticle = form.querySelector('article.question[data-question-id="Q1_dana_goal"]');
        } else if (questionNameOrId === "q2") {
            questionArticle = form.querySelector('article.question[data-question-id="Q2_dana_communication"]');
        } else if (questionNameOrId === "q3") {
            questionArticle = form.querySelector('article.question[data-question-id="Q3_dana_adaptation"]');
        }

        if (!questionArticle) return;

        questionArticle.classList.add("error");

        var area = questionArticle.querySelector("[data-answer-area]");
        if (area) area.classList.add("error");

        var msg = questionArticle.querySelector(".error-msg");
        if (msg) msg.textContent = message;

        hasErrors = true;
    }

    var q1Selected = form.querySelector('input[name="q1"]:checked');
    if (!q1Selected) {
        markQuestionError("q1", "חובה לבחור תשובה לשאלה 1");
    }

    var q2Selected = form.querySelector('input[name="q2"]:checked');
    if (!q2Selected) {
        markQuestionError("q2", "חובה לבחור תשובה לשאלה 2");
    }

    var q3Input = document.getElementById("q3");
    if (!q3Input || !q3Input.value.trim()) {
        markQuestionError("q3", "חובה למלא תשובה לשאלה 3");
        if (q3Input) q3Input.classList.add("input-error");
    }

    if (hasErrors) {
        var quizError = document.getElementById("quizError");
        if (quizError) quizError.textContent = "יש להשלים תשובות חסרות כדי להמשיך";
        return false;
    }

    return true;
}

/* בדיקת תשובות */
function checkQuiz() {
    var interactions = [];
    if (!form) return interactions;

    var feedbacks = form.querySelectorAll(".feedback");
    for (var i = 0; i < feedbacks.length; i++) {
        feedbacks[i].textContent = "";
    }

    /* שאלה 1 */
    var q1Selected = form.querySelector('input[name="q1"]:checked');
    if (q1Selected) {
        var answerKey = q1Selected.value;
        var answerText = q1Selected.dataset.text || "";
        var isCorrectQ1 = answerKey === "b";

        var fb1 = document.getElementById("q1-feedback");
        if (fb1) {
            fb1.textContent = isCorrectQ1
                ? "נכון. המטרה היא שמירה על רצף לימודי ותמיכה רגשית."
                : "לא נכון. המטרה היא שמירה על רצף לימודי ותמיכה רגשית.";
        }

        interactions.push({
            id: "Q1_dana_goal",
            type: "choice",
            student_response: answerText,
            result: isCorrectQ1 ? "correct" : "wrong",
            correct_responses: ["לשמור על רצף לימודי ותמיכה רגשית בזמן האשפוז"]
        });
    }

    /* שאלה 2 */
    var q2Selected = form.querySelector('input[name="q2"]:checked');
    if (q2Selected) {
        var value = q2Selected.value;
        var answerTextQ2 = q2Selected.dataset.text || "";
        var isCorrectQ2 = value === "true";

        var fb2 = document.getElementById("q2-feedback");
        if (fb2) {
            fb2.textContent = isCorrectQ2
                ? "נכון מאוד."
                : "שגוי, יש כן קשר עם בתי הספר בקהילה.";
        }

        interactions.push({
            id: "Q2_dana_communication",
            type: "true-false",
            student_response: answerTextQ2,
            result: isCorrectQ2 ? "correct" : "wrong",
            correct_responses: ["נכון"]
        });
    }

    /* שאלה 3 */
    var q3Input = document.getElementById("q3");
    if (q3Input) {
        var raw = q3Input.value.trim();
        var normalized = raw.replace(/\s+/g, " ").toLowerCase();

        var expected = "מצבו הרפואי";
        var isCorrectQ3 = normalized.indexOf("מצבו") !== -1 && normalized.indexOf("רפואי") !== -1;

        var fb3 = document.getElementById("q3-feedback");
        if (fb3) {
            fb3.textContent = isCorrectQ3
                ? "נכון, הלמידה מותאמת למצבו הרפואי של כל ילד."
                : "הרעיון הוא שהלמידה מותאמת למצבו הרפואי של הילד.";
        }

        interactions.push({
            id: "Q3_dana_adaptation",
            type: "fill-in",
            student_response: raw,
            result: isCorrectQ3 ? "correct" : "wrong",
            correct_responses: [expected]
        });
    }

    interactionsBatch = interactions;
    return interactions;
}

function calculateFinalScore(interactions) {
    if (!interactions || !interactions.length) return 0;

    var total = interactions.length;
    var correct = 0;

    for (var i = 0; i < interactions.length; i++) {
        if (interactions[i].result === "correct") correct++;
    }

    return Math.round((correct / total) * 100);
}

function sendInteractionsBatchToLMS(interactions) {
    if (!interactions || !interactions.length) return;
    if (!isScormConnected) return;

    var countStr = scormGet("cmi.interactions._count") || "0";
    var i = parseInt(countStr, 10);
    if (!isFinite(i)) i = 0;

    for (var j = 0; j < interactions.length; j++) {
        var it = interactions[j];
        var base = "cmi.interactions." + i;

        scormSet(base + ".id", it.id);
        scormSet(base + ".type", it.type);
        scormSet(base + ".student_response", it.student_response);
        scormSet(base + ".result", it.result);

        scormSet(base + ".correct_responses.0.pattern", it.correct_responses);

        i++;
    }

    scormSave();
}

/* לחיצה בדיקת תשובות */
function handleQuizSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    // אם יש שגיאות - לא מציגים את בלוק ההגשה
    if (!validateQuizInline()) {
        setFinalizeBlockVisible(false);
        clearFinalizeMessage();

        var firstError = document.querySelector(".answer-area.error");
        if (firstError) {
            var y = firstError.getBoundingClientRect().top + window.pageYOffset - 120;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
        return;
    }

    // נועל את כפתור הבדיקה כדי שלא ילחצו שוב
    setCheckDisabled(true);

    // נועל את כל השדות בטופס (רדיו וטקסט) כדי למנוע שינויים אחרי הבדיקה
    setFormInputsDisabled(true);

    var interactions = checkQuiz();
    sendInteractionsBatchToLMS(interactions);

    // ✅ אחרי בדיקת תשובות בהצלחה: מציגים את בלוק ההגשה ומאפשרים לחיצה
    setFinalizeBlockVisible(true);
    clearFinalizeMessage();
    setFinalizeDisabled(false);
}

/* סיום */
function finalizeAndCloseLMSConnection() {
    if (!isScormConnected) return;

    setFinalizeDisabled(true);

    if (!interactionsBatch || !interactionsBatch.length) {
        console.warn("[Finalize] No interactions batch found. Run the check step first.");
        return;
    }

    var score = calculateFinalScore(interactionsBatch);

    scormSet("cmi.core.score.min", "0");
    scormSet("cmi.core.score.max", "100");
    scormSet("cmi.core.score.raw", String(score));

    var passingScore = 60;
    var status = (score >= passingScore) ? "passed" : "failed";
    scormSet("cmi.core.lesson_status", status);

    // עדכון מיקום להגשה וביצוע שמירה
    setLocation("submitted");

    var finalizeMsg = document.getElementById("finalize-msg");
    if (finalizeMsg) {
        finalizeMsg.textContent = "הלומדה הוגשה בהצלחה";
        finalizeMsg.classList.add("success-msg");
        finalizeMsg.style.display = "inline-block";
    }

    // נועל את כל הכפתורים והשדות כי ההגשה הסתיימה
    setCheckDisabled(true);
    setResetDisabled(true);
    setFinalizeDisabled(true);
    setFormInputsDisabled(true);

    scormSet("cmi.core.exit", "logout");
    scormSave();

    setTimeout(function () {
        scormQuit();
    }, 300);
}

/* איפוס */
function resetQuizForm() {
    if (!form) return;

    form.reset();

    var feedbackElements = form.querySelectorAll(".feedback");
    for (var i = 0; i < feedbackElements.length; i++) {
        feedbackElements[i].textContent = "";
    }

    interactionsBatch = [];

    clearInlineErrors();

    // משחרר את הנעילה של השדות כדי לאפשר מילוי מחדש
    setFormInputsDisabled(false);

    // מאפשר לחיצה מחדש על כפתורי הבדיקה
    // את כפתור הניקוי נשבית שוב כי הטופס ריק
    setCheckDisabled(false);
    setResetDisabled(true);

    setFinalizeDisabled(true);

    // ✅ באיפוס - מסתירים שוב את בלוק ההגשה
    setFinalizeBlockVisible(false);
    clearFinalizeMessage();

    var quizNote = document.getElementById("quizNote");
    if (quizNote) {
        quizNote.classList.remove("show");
        quizNote.textContent = "";
    }
}

function scormPrintSummary(prefix) {
    if (!isScormConnected) {
        console.log(prefix + " SCORM not connected");
        return;
    }

    console.log(prefix + " student_name =", scormGet("cmi.core.student_name"));
    console.log(prefix + " lesson_status =", scormGet("cmi.core.lesson_status"));
    console.log(prefix + " lesson_location =", scormGet("cmi.core.lesson_location"));
    console.log(prefix + " suspend_data =", scormGet("cmi.suspend_data"));
    console.log(prefix + " score.raw =", scormGet("cmi.core.score.raw"));
    console.log(prefix + " interactions._count =", scormGet("cmi.interactions._count"));
    console.log(prefix + " exit =", scormGet("cmi.core.exit"));
}
