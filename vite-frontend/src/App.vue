<template>
  <div id="app">
    <header>
      <button class="hamburger" @click="toggleNav">☰</button>
      <h1>BAY-AUTO Chatbot</h1>
    </header>
    <div class="main-container">
      <!-- Side Navigation -->
      <div :class="{ 'side-nav': true, show: showNav }">
        <h2>Categories</h2>
        <ul>
          <li class="nav-item" @click="showImages('cars')">Cars</li>
          <li class="nav-item" @click="showImages('motorcycles')">Motorcycles</li>
        </ul>
        <h3 @click="toggleNav">X</h3>
      </div>

      <!-- Main Content -->
      <main class="content">
        <p>Powered by ChatGPT API</p>

        <!-- Search Input and Button -->
        <div>
          <input
            type="text"
            v-model="userInput"
            placeholder="Type your question for GPT..."
            @keyup.enter="loadData"
          />
          <button id="searchButton" @click="loadData">Ask BAY-NANA</button>
        </div>

        <!-- Display Images -->
        <div>
          <img
            v-for="image in images"
            :key="image"
            :src="image"
            :alt="image"
            class="car-image"
            @click="updateData(image)"
          />
        </div>

        <!-- Display GPT Response -->
        <div v-if="data">
          <pre>{{ data }}</pre>
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from "vue";

export default {
  name: "App",
  setup() {
    const images = ref<string[]>([]); // Array to store image URLs
    const data = ref<string | null>(null); // GPT response or status message
    const userInput = ref<string>(""); // User input for the chatbot
    const selectedImage = ref<string | null>(null); // Selected image name
    const showNav = ref<boolean>(false); // Controls the visibility of the side navigation

    const fetchImages = async (category: string) => {
      let endpoint = "";

      // Determine which endpoint to call based on the category
      if (category === "cars") {
        endpoint = "/list-images-cars";
      } else if (category === "motorcycles") {
        endpoint = "/list-images-motorcycles";
      } else {
        endpoint = "/list-images"; // Default: Fetch all images
      }

      try {
        const response = await fetch(`http://localhost:3000${endpoint}`); // Update backend endpoint if necessary
        if (response.ok) {
          const result = await response.json();
          if (result.images) {
            // Filter out URLs ending with a trailing slash (directories)
            images.value = result.images.filter((url: string) => !url.endsWith("/"));
          } else {
            console.error("Unexpected response format:", result);
          }
        } else {
          console.error("Failed to fetch images:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    const updateData = (image: string) => {
      const prePrompt = image.split("/").pop()?.replace(/\.(png|jpg|jpeg)$/i, "") || "";
      data.value = `Selected Automobile: ${prePrompt}`;
      selectedImage.value = prePrompt;
    };

    const toggleNav = () => {
      showNav.value = !showNav.value;
    };

    const showImages = (category: string) => {
      fetchImages(category);
      toggleNav();
    };

    const loadData = async () => {
      if (!userInput.value.trim()) {
        alert("Please enter a question!");
        return;
      }

      const prePrompt = selectedImage.value
        ? `Automobile Context: ${selectedImage.value}. Please answer within 150 tokens. `
        : "Please answer within 150 tokens. ";

      try {
        const response = await fetch("http://localhost:3000/gpt-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: `${prePrompt}${userInput.value}` }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.choices && result.choices.length > 0) {
            data.value = result.choices[0].message.content.trim(); // Access the GPT response
          } else {
            data.value = "No response from GPT. Please try again.";
            console.error("Unexpected API response:", result);
          }
        } else {
          data.value = `Error: Failed to fetch data from backend. Status: ${response.status}`;
          console.error("Failed to fetch data from backend");
        }
      } catch (error) {
        data.value = "Error: Unable to fetch data. Please try again later.";
        console.error("Error fetching data:", error);
      }
    };

    return {
      images,
      data,
      userInput,
      loadData,
      updateData,
      showNav,
      toggleNav,
      showImages,
    };
  },
};
</script>

<style scoped>
/* General App Styles */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
}

header {
  display: flex;
  align-items: center;
  background-color: #d1b239;
  padding: 20px;
}

header h1 {
  color: white;
  margin: 0 auto;
  /* Centers the title */
}

.hamburger {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 0;
  font-size: 32px;
}

.hamburger:hover {
  color: #1f1f1f;

}

/* Side Navigation */
.side-nav {
  position: fixed;
  top: 0;
  left: -300px;
  /* Hidden by default */
  width: 250px;
  height: 100vh;
  background-color: #1f1f1f;
  color: white;
  padding: 20px;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.3);
  z-index: 1050;
  transition: transform 0.3s ease-in-out, left 0.3s ease-in-out;
}

.side-nav.show {
  left: 0;
  /* Slide in */
}

.side-nav h3 {
  display: flex;
  justify-content: right;
  margin-top: -210px;
}

.side-nav h3:hover {
  cursor: pointer;
}

.side-nav h2 {
  font-size: 24px;
  color: #ffffff;
  margin-bottom: 20px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.side-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.side-nav .nav-item {
  font-size: 18px;
  margin: 15px 0;
  padding: 10px 20px;
  border-radius: 5px;
  background-color: #333;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.side-nav .nav-item:hover {
  background-color: #d1b239;
  color: black;
}

/* Main Content */
.content {
  flex: 1;
  padding: 20px;
  transition: margin-left 0.3s ease-in-out;
}

.content.hidden {
  margin-left: 0;
  /* Adjust when nav is hidden */
}

/* Input and Buttons */
#searchButton {
  background-color: #d1b239;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
}

#searchButton:hover {
  background-color: #bfa02c;
}

input {
  padding: 10px;
  margin: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/* Preformatted Text */
pre {
  background-color: rgb(61, 61, 61);
  padding: 15px;
  border-radius: 4px;
  font-size: 16px;
  text-align: left;
  color: white;
  overflow-x: auto;
  white-space: pre-wrap;
}

/* Car Image Styling */
.car-image {
  width: 200px;
  margin: 10px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.car-image:hover {
  cursor: pointer;
  box-shadow: #d1b239 1px 1px 10px;
}

@media (max-width: 768px) {
  .side-nav {
    width: 200px;
    /* Narrower for smaller screens */
  }

  .content {
    margin-left: 200px;
    /* Adjust content margin */
  }
}
</style>
