// Fictional, public fixture. No customer data or database reads.
export const sampleProperty = {
  name: "Rosewood Cottage", slug: "guestsetgo-sample", hostName: "Alex",
  propertyPhoto: { img: "/home/cottage.jpg", alt: "A timber holiday cottage surrounded by trees — fictional sample property" },
  intro: "Welcome to our fictional holiday home. Here's everything you need for a comfortable stay.",
  checkInTime: "4pm", checkOutTime: "10am", accent: "#087f68",
  arrivalSteps: ["Follow the garden path to the front door.", "Your host shares the key-safe code before arrival.", "Close the key safe and scramble the numbers after collecting your key."],
  wifiName: "Rosewood_Guest", wifiPassword: "ExampleOnly123", wifiNote: "These are fictional details for the sample guide.",
  photoGuides: [
    { id: "heating", title: "Heating and hot water", area: "Hallway thermostat", img: "/home/thermostat.svg", pins: [{ x: 50, y: 64, label: "Turn the dial to set your preferred temperature." }], steps: ["Press the dial to wake the display.", "Turn clockwise for warmer or anticlockwise for cooler.", "Hot water is on a timer; no adjustment is needed."] },
    { id: "kitchen", title: "Kitchen appliances", area: "Making yourself at home", img: "/home/kitchen.jpg", steps: ["Find the dishwasher tablets in the cupboard under the sink.", "Load the dishwasher and put one tablet in the dispenser.", "Select Eco, press Start and close the door."] },
    { id: "hot-tub", title: "Hot tub", area: "Garden", img: "/home/hot-tub.svg", pins: [{ x: 71, y: 61, label: "Press Jets on the control panel to turn the bubbles on or off." }], steps: ["Read the safety guidance provided by your host before use.", "Unclip the cover and lift it off with another adult.", "Use the control panel to switch on the jets. The temperature is preset.", "When finished, turn off the jets and secure the cover."] },
  ],
  checkoutTasks: ["Switch off the lights and appliances.", "Put used dishes in the dishwasher.", "Close the windows and lock the door.", "Return the key to the key safe and scramble the numbers."],
  checkoutNote: "Thank you for staying. This sample is read-only; nothing is sent to a host.",
};
