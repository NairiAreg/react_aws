# Code to get all FB friends avatars sources
// Select all the img elements that match the given query selector
const imgElements = document.querySelectorAll("#mount_0_0_oN > div > div:nth-child(1) > div > div.x9f619.x1n2onr6.x1ja2u2z > div > div > div.x78zum5.xdt5ytf.x1t2pt76.x1n2onr6.x1ja2u2z.x10cihs4 > div.x78zum5.xdt5ytf.x1t2pt76 > div > div > div.x6s0dn4.x78zum5.xdt5ytf.x193iq5w > div > div > div > div > div > div > div > div > div.x78zum5.x1q0g3np.x1a02dak.x1qughib > div > div > a > img");

// Create an array to store the src attributes
const srcArray = [];

// Loop through each img element and push its src attribute to the array
imgElements.forEach(img => {
srcArray.push(img.getAttribute("src"));
});

console.log(srcArray);
