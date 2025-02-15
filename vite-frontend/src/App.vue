<template>
  <div id="app">
    <header>
      <button class="hamburger" @click="toggleNav">☰</button>
      <h1>BAY-AUTO Chatbot</h1>
    </header>
    <div class="main-container">
      <div :class="{ 'side-nav': true, show: showNav }">
        <h2>Categories</h2>
        <ul>
          <li class="nav-item" @click="showImages('cars')">Cars</li>
          <li class="nav-item" @click="showImages('motorcycles')">Motorcycle</li>
        </ul>
        <h3 @click="toggleNav">X</h3>
      </div>

      <main class="content">
        <p>Powered by ChatGPT API</p>
        <div class="car-image-container" :class="{ 'column-layout': selectedImage }">
          <div v-for="image in images" :key="image" class="image-wrapper">
            <img :src="image" :alt="image" class="car-image" :class="{ selected: selectedImage === image }"
              @click="updateData(image)" />
            <div v-if="selectedImage === image" class="input-container">
              <input type="text" v-model="userInput" placeholder="Ask BAY-NANA..." @keyup.enter="loadData" />
              <button id="searchButton" @click="loadData">Ask BAY-NANA</button>
            </div>
            <div v-if="selectedImage === image && data" class="data-response">
              <pre>{{ data }}</pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// ✅ Correct TypeScript Syntax
const images = ref([] as string[]);
const userInput = ref("");
const selectedImage = ref<string | null>(null);
const data = ref<string | null>(null);
const showNav = ref(false);

const API_GATEWAY_BASE_URL = "https://z29mmvkyfj.execute-api.ap-southeast-1.amazonaws.com/prod";

// ✅ Fetch Images from API Gateway
const fetchImages = async (category: string) => {
  const endpoint = `${API_GATEWAY_BASE_URL}/fetch-s3?category=${category}`;
  try {
    const response = await fetch(endpoint);
    if (response.ok) {
      const result = await response.json();
      images.value = result.images?.filter((url: string) => !url.endsWith("/")) || [];
    } else {
      console.error("Failed to fetch images:", response.statusText);
    }
  } catch (error) {
    console.error("Error fetching images:", error);
  }
};

// ✅ Select & Show Image Details
const updateData = (image: string) => {
  selectedImage.value = selectedImage.value === image ? null : image;
  data.value = selectedImage.value
    ? `Selected Automobile: ${selectedImage.value.split("/").pop()?.replace(/\.(png|jpg|jpeg)$/i, "")}`
    : null;
};

const loadData = async () => {
  if (!userInput.value.trim()) {
    alert("Please enter a question!");
    return;
  }

  const prePrompt = selectedImage.value
    ? `Automobile Context: ${selectedImage.value}. Please answer within 150 tokens.`
    : "Please answer within 150 tokens.";

  const requestBody = { input: `${prePrompt} ${userInput.value}` };

  console.log("Sending request body:", JSON.stringify(requestBody));

  try {
    const response = await fetch(`${API_GATEWAY_BASE_URL}/gpt-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody), // ✅ Convert to JSON before sending
    });

    console.log("Raw API Response:", response);

    if (!response.ok) {
      console.error("Server error:", response.status, response.statusText);
      data.value = `Error: ${response.status}`;
      return;
    }

    const result = await response.json();
    console.log("Full API Response JSON:", result);

    // ✅ Ensure `result.body` is parsed correctly
    const responseBody = typeof result.body === "string" ? JSON.parse(result.body) : result.body;

    // ✅ Extract GPT response correctly
    if (!responseBody.choices || !responseBody.choices.length) {
      data.value = "No valid response from API.";
      return;
    }

    const messageContent = responseBody.choices[0].message?.content || "No response from GPT.";
    data.value = messageContent.trim();

  } catch (error) {
    console.error("Error fetching data:", error);
    data.value = "Error: Unable to fetch data.";
  }
};

// ✅ Toggle Sidebar
const toggleNav = () => {
  showNav.value = !showNav.value;
};

// ✅ Show Category Images
const showImages = (category: string) => {
  fetchImages(category);
  toggleNav();
};
</script>

<style scoped>
/* 🔹 Styling (Same as Before) */
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
}

.hamburger {
  background: none;
  border: none;
  color: white;
  font-size: 32px;
  cursor: pointer;
}

.hamburger:hover {
  color: #1f1f1f;
}

.side-nav {
  position: fixed;
  top: 0;
  left: -300px;
  width: 250px;
  height: 100vh;
  background-color: #1f1f1f;
  color: white;
  padding: 20px;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.3);
  z-index: 1050;
  transition: left 0.3s ease-in-out;
}

.side-nav.show {
  left: 0;
}

.side-nav h3 {
  text-align: right;
  cursor: pointer;
}

.side-nav h2 {
  font-size: 24px;
  color: white;
  margin-bottom: 20px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.side-nav ul {
  list-style: none;
  padding: 0;
}

.nav-item {
  font-size: 18px;
  padding: 10px;
  border-radius: 5px;
  background-color: #333;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
}

.nav-item:hover {
  background-color: #d1b239;
  color: black;
}

.car-image-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
}

.car-image-container.column-layout {
  flex-direction: column;
  align-items: center;
}

.car-image {
  width: 200px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.3s;
}

.car-image:hover {
  box-shadow: #d1b239 1px 1px 10px;
}

.input-container {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

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

pre {
  background-color: rgb(61, 61, 61);
  padding: 15px;
  color: white;
  border-radius: 4px;
  white-space: pre-wrap;
}
</style>
