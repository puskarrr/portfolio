// Normal Function
function greet(name) {
    return `Hello, ${name}!`;
  }
console.log(greet("Alice")); 

// eg:
function a(a1) {
    return `Normal fun prints ${a1}`
}

// Arrow Function
const helo = (naamee, age) => `I am ${naamee} and age is ${age}`;
console.log(helo("dfsf",25));   

// For each
const nums = [1, 2, 3];
nums.forEach(num => {
  console.log(num * 2);
});

// Map function
const numbs = [1, 2, 3];
const doubled = numbs.map(num => num * 2);
console.log(doubled); // [2, 4, 6]

// for in
const person = { name: "Alice", age: 25 };
for (let key in person) {
  console.log(`${key}: ${person[key]}`);
}
