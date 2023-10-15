const fs = require("fs");
const csv = require("csv-parser");

const employees = [];
const employeesWithConsecutiveDays = new Set();
const employeesWithShortBreaks = new Set();
const employeesWithLongShifts = new Set();

const filename = "timecard.csv"; // Change the filename accordingly

fs.createReadStream(filename)
  .pipe(csv())
  .on("data", (row) => {
    employees.push(row);
  })
  .on("end", () => {
    // Group entries by pay cycle
    const employeeEntries = {};

    employees.forEach((employee) => {
      const key = `${employee["Employee Name"]}_${employee["Pay Cycle Start Date"]}_${employee["Pay Cycle End Date"]}`;

      if (!employeeEntries[key]) {
        employeeEntries[key] = [];
      }

      // Convert date strings to JavaScript Date objects
      employeeEntries[key].push({
        timeIn: new Date(employee.Time),
        timeOut: new Date(employee["Time Out"]),
        timecardHours: employee["Timecard Hours (as Time)"],
      });
    });

    // Analyze data to find employees who worked for 7 consecutive days
    Object.keys(employeeEntries).forEach((key) => {
      const entries = employeeEntries[key];
      const employeeName = key.split("_")[0];

      // Check for 7 consecutive days
      let consecutiveDaysCount = 1;
      let hasConsecutiveDays = false;

      for (let i = 0; i < entries.length; ++i) {
        const currentDay = entries[i].timeIn.getDate();
        const nextDay =
          entries[i + 1 === entries.length ? i : i + 1].timeIn.getDate();

        // Check if the days are 7 or more consecutive
        if (nextDay - currentDay === 1 || nextDay - currentDay === 0) {
          if (nextDay - currentDay === 1) {
            consecutiveDaysCount++;
          } else if (consecutiveDaysCount >= 7) {
            hasConsecutiveDays = true;
            break;
          }
        } else {
          consecutiveDaysCount = 1; // Reset count if days are not consecutive
        }
      }

      // If 7 consecutive days are found, add the employee to the set

      if (hasConsecutiveDays) {
        employeesWithConsecutiveDays.add(employeeName);
      }

      // Check for less than 10 hours of time between shifts but greater than 1 hour
      for (let i = 0; i < entries.length - 1; ++i) {
        const timeBetweenShifts = entries[i + 1].timeIn - entries[i].timeOut;

        // Convert milliseconds to hours
        const hoursBetweenShifts = timeBetweenShifts / (1000 * 60 * 60);

        // If the break is less than 10 hours and greater than 1 hour, add the employee to the set
        if (hoursBetweenShifts > 1 && hoursBetweenShifts < 10) {
          employeesWithShortBreaks.add(employeeName);
        }
      }

      // Check for shifts longer than 14 hours
      entries.forEach((entry) => {
        const [hours, minutes] = entry.timecardHours.split(":").map(Number);
        const date = new Date();

        // Set the date to today and set hours and minutes
        date.setHours(hours);
        date.setMinutes(minutes);

        // Get the total hours
        const shiftDuration = date.getHours() + date.getMinutes() / 60;

        // If the shift is longer than 14 hours, add the employee to the set
        if (shiftDuration > 14) {
          employeesWithLongShifts.add(employeeName);
        }
      });
    });

    // Print the names of employees who worked for 7 consecutive days
    console.log("Employees who worked for 7 consecutive days:");
    employeesWithConsecutiveDays.forEach((employeeName) => {
      console.log(employeeName);
    });

    // Print the names of employees with short breaks between shifts
    console.log(
      "\nEmployees with short breaks between shifts (less than 10 hours):"
    );
    employeesWithShortBreaks.forEach((employeeName) => {
      console.log(employeeName);
    });

    // Print the names of employees with long shifts (more than 14 hours)
    console.log(
      "\nEmployees who worked for more than 14 hours in a single shift:"
    );
    employeesWithLongShifts.forEach((employeeName) => {
      console.log(employeeName);
    });
  });
