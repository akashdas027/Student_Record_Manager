/* ============================================================
   STUDENT LEDGER — AngularJS application logic
   ============================================================
   NOTE ON THE FIX:
   The add-student form, search box, and report-card dropdown all
   live inside ng-if blocks. ng-if creates a new CHILD SCOPE each
   time its condition becomes true. Binding ng-model directly to a
   plain variable (e.g. ng-model="name") makes Angular create that
   property on the child scope instead of the controller's scope,
   so $scope.name on the controller never updates — that's why
   "Add Student" silently did nothing.
   Fix: bind to a property of an OBJECT (ng-model="entry.name").
   Objects are shared by reference across the prototype chain, so
   the child scope writes to the SAME object the controller reads.
   ============================================================ */

var app = angular.module("studentApp", []);

app.controller("studentCtrl", function ($scope) {

    // ---------------- state ----------------

    $scope.students = [];

    // form fields grouped in an object — see note above
    $scope.entry = {
        name: "",
        roll: "",
        marks: ""
    };

    $scope.filters = {
        search: ""
    };

    $scope.report = {
        selected: ""
    };

    $scope.editMode = false;
    $scope.editIndex = -1;

    $scope.activeTab = "dashboard";

    $scope.sortKey = "name";
    $scope.sortReverse = false;

    $scope.gradeOrder = ["A", "B", "C", "Fail"];

    $scope.reportStudent = null;

    $scope.today = new Date().toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric"
    });

    // ---------------- tabs ----------------

    $scope.setTab = function (tab) {
        $scope.activeTab = tab;
    };

    // ---------------- grading ----------------

    $scope.gradeOf = function (marks) {
        if (marks >= 90) return "A";
        if (marks >= 75) return "B";
        if (marks >= 50) return "C";
        return "Fail";
    };

    $scope.remarkOf = function (marks) {
        if (marks >= 90) return "Outstanding performance.";
        if (marks >= 75) return "Very good work.";
        if (marks >= 50) return "Satisfactory, room to improve.";
        return "Needs significant improvement.";
    };

    $scope.rankOf = function (student) {
        var sorted = $scope.students.slice().sort(function (a, b) {
            return b.marks - a.marks;
        });
        for (var i = 0; i < sorted.length; i++) {
            if (sorted[i] === student) return i + 1;
        }
        return "-";
    };

    // ---------------- CRUD ----------------

    $scope.addStudent = function () {

        var name = $scope.entry.name;
        var roll = $scope.entry.roll;
        var marks = $scope.entry.marks;

        if (name && roll && marks !== null && marks !== undefined && marks !== "") {

            var marksNum = Number(marks);

            if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
                alert("Marks must be a number between 0 and 100.");
                return;
            }

            var duplicate = false;

            for (var i = 0; i < $scope.students.length; i++) {
                if ($scope.students[i].name.toLowerCase() === name.toLowerCase() && i !== $scope.editIndex) {
                    duplicate = true;
                    break;
                }
            }

            if (duplicate) {
                var answer = confirm("Student with this name already exists.\nDo you want to continue?");
                if (!answer) {
                    return;
                }
            }

            if ($scope.editMode) {

                $scope.students[$scope.editIndex].name = name;
                $scope.students[$scope.editIndex].roll = roll;
                $scope.students[$scope.editIndex].marks = marksNum;

                $scope.editMode = false;
                $scope.editIndex = -1;

            } else {

                $scope.students.push({
                    name: name,
                    roll: roll,
                    marks: marksNum
                });

            }

            $scope.entry = { name: "", roll: "", marks: "" };
            $scope.computeStats();
        }

    };

    $scope.editStudent = function (index) {
        var s = $scope.students[index];
        $scope.entry = { name: s.name, roll: s.roll, marks: s.marks };
        $scope.editMode = true;
        $scope.editIndex = index;
    };

    $scope.cancelEdit = function () {
        $scope.entry = { name: "", roll: "", marks: "" };
        $scope.editMode = false;
        $scope.editIndex = -1;
    };

    $scope.removeStudent = function (student) {
        var index = $scope.students.indexOf(student);
        if (index > -1) {
            $scope.students.splice(index, 1);
        }
        if ($scope.reportStudent === student) {
            $scope.reportStudent = null;
            $scope.report.selected = "";
        }
        $scope.computeStats();
    };

    // ---------------- sorting ----------------

    $scope.setSort = function (key) {
        if ($scope.sortKey === key) {
            $scope.sortReverse = !$scope.sortReverse;
        } else {
            $scope.sortKey = key;
            $scope.sortReverse = false;
        }
    };

    // ---------------- dashboard stats ----------------

    $scope.barWidth = function (count) {
        var max = 0;
        angular.forEach($scope.gradeOrder, function (g) {
            var c = $scope.stats.distribution[g] || 0;
            if (c > max) max = c;
        });
        if (!max) return "0%";
        return Math.round((count / max) * 100) + "%";
    };

    $scope.computeStats = function () {

        var list = $scope.students;
        var stats = {
            average: 0,
            highest: 0,
            lowest: 0,
            passPercent: 0,
            distribution: { A: 0, B: 0, C: 0, Fail: 0 },
            toppers: []
        };

        if (list.length) {

            var total = 0;
            var high = list[0].marks;
            var low = list[0].marks;
            var passCount = 0;

            angular.forEach(list, function (s) {
                total += s.marks;
                if (s.marks > high) high = s.marks;
                if (s.marks < low) low = s.marks;
                if (s.marks >= 50) passCount++;
                stats.distribution[$scope.gradeOf(s.marks)]++;
            });

            stats.average = Math.round((total / list.length) * 10) / 10;
            stats.highest = high;
            stats.lowest = low;
            stats.passPercent = Math.round((passCount / list.length) * 100);

            stats.toppers = list.slice().sort(function (a, b) {
                return b.marks - a.marks;
            }).slice(0, 3);
        }

        $scope.stats = stats;
    };

    $scope.computeStats();

    // ---------------- report card ----------------

    $scope.viewReportCard = function (student) {
        $scope.reportStudent = student;
        $scope.report.selected = student.name + " (Roll " + student.roll + ")";
        $scope.activeTab = "report";
    };

    $scope.pickStudent = function () {
        var label = $scope.report.selected;
        var found = null;
        angular.forEach($scope.students, function (s) {
            if (s.name + " (Roll " + s.roll + ")" === label) {
                found = s;
            }
        });
        $scope.reportStudent = found;
    };

    $scope.printReport = function () {
        window.print();
    };

    // ---------------- export CSV ----------------

    $scope.exportCSV = function () {

        var rows = [["Name", "Roll No", "Marks", "Grade"]];

        angular.forEach($scope.students, function (s) {
            rows.push([s.name, s.roll, s.marks, $scope.gradeOf(s.marks)]);
        });

        var csvContent = rows.map(function (row) {
            return row.map(function (cell) {
                var value = String(cell).replace(/"/g, '""');
                return '"' + value + '"';
            }).join(",");
        }).join("\n");

        var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);

        var link = document.createElement("a");
        link.href = url;
        link.download = "student-ledger.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // ---------------- calculator ----------------

    $scope.calcDisplay = "0";
    $scope.calcStored = null;
    $scope.calcOperatorValue = null;
    $scope.calcWaitingForOperand = false;

    $scope.calcDigit = function (digit) {
        if ($scope.calcWaitingForOperand) {
            $scope.calcDisplay = digit;
            $scope.calcWaitingForOperand = false;
        } else {
            $scope.calcDisplay = ($scope.calcDisplay === "0") ? digit : $scope.calcDisplay + digit;
        }
    };

    $scope.calcDecimal = function () {
        if ($scope.calcWaitingForOperand) {
            $scope.calcDisplay = "0.";
            $scope.calcWaitingForOperand = false;
            return;
        }
        if ($scope.calcDisplay.indexOf(".") === -1) {
            $scope.calcDisplay += ".";
        }
    };

    $scope.calcClear = function () {
        $scope.calcDisplay = "0";
        $scope.calcStored = null;
        $scope.calcOperatorValue = null;
        $scope.calcWaitingForOperand = false;
    };

    $scope.calcBackspace = function () {
        if ($scope.calcDisplay.length > 1) {
            $scope.calcDisplay = $scope.calcDisplay.slice(0, -1);
        } else {
            $scope.calcDisplay = "0";
        }
    };

    $scope.calcPercent = function () {
        $scope.calcDisplay = String(parseFloat($scope.calcDisplay) / 100);
    };

    $scope.calcOperate = function (op, a, b) {
        switch (op) {
            case "+": return a + b;
            case "-": return a - b;
            case "*": return a * b;
            case "/": return b === 0 ? 0 : a / b;
            default: return b;
        }
    };

    $scope.calcOperator = function (nextOperator) {
        var inputValue = parseFloat($scope.calcDisplay);

        if ($scope.calcStored === null) {
            $scope.calcStored = inputValue;
        } else if (!$scope.calcWaitingForOperand) {
            var result = $scope.calcOperate($scope.calcOperatorValue, $scope.calcStored, inputValue);
            $scope.calcDisplay = String(Math.round(result * 100000) / 100000);
            $scope.calcStored = result;
        }

        $scope.calcWaitingForOperand = true;
        $scope.calcOperatorValue = nextOperator;
    };

    $scope.calcEquals = function () {
        var inputValue = parseFloat($scope.calcDisplay);

        if ($scope.calcOperatorValue !== null && $scope.calcStored !== null) {
            var result = $scope.calcOperate($scope.calcOperatorValue, $scope.calcStored, inputValue);
            $scope.calcDisplay = String(Math.round(result * 100000) / 100000);
            $scope.calcStored = null;
            $scope.calcOperatorValue = null;
            $scope.calcWaitingForOperand = true;
        }
    };

    $scope.calcClassAverage = function () {
        $scope.computeStats();
        $scope.calcDisplay = String($scope.stats.average || 0);
        $scope.calcStored = null;
        $scope.calcOperatorValue = null;
        $scope.calcWaitingForOperand = true;
    };

});
