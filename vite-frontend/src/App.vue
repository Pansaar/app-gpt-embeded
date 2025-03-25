<template>
  <div id="app">
    <header>
      <button class="hamburger" @click="toggleNav">☰</button>
      <h1>BAY-AUTO Chatbot</h1>
    </header>

    <div class="main-container">
      <!-- Sidebar Navigation -->
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

        <!-- Image Display Section -->
        <div class="car-image-container" :class="{ 'column-layout': selectedImage }">
          <div v-for="image in images" :key="image.s3_url" class="image-wrapper">
            <img :src="image.s3_url" alt="Car Image" class="car-image" @click="updateData(image)" />
            
            <!-- Input and Response Section -->
            <div v-if="selectedImage === image.s3_url" class="input-container">
              <input type="text" v-model="userInput" placeholder="Ask BAY-NANA..." @keyup.enter="loadData" />
              <button id="searchButton" @click="loadData">Ask BAY-NANA</button>
            </div>

            <!-- ✅ Styled ChatGPT-like Response -->
            <div v-if="selectedImage === image.s3_url && data" class="chat-response">
              <div class="chat-bubble">
                <span class="chat-text">{{ data }}</span>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { int } from "aws-sdk/clients/datapipeline";
import { ref } from "vue";

// ✅ State Variables
const images = ref<{ s3_url: string; vehicle_brand: string; vehicle_model: string; model_year: int }[]>([]);
const userInput = ref("");
const selectedImage = ref<string | null>(null);
const data = ref<string | null>(null);
const showNav = ref(false);

const API_GATEWAY_BASE_URL = "https://z29mmvkyfj.execute-api.ap-southeast-1.amazonaws.com/prod";

const fetchImages = async (category: string) => {
  const endpoint = `${API_GATEWAY_BASE_URL}/fetch-s3?category=${category}`;
  try {
    const response = await fetch(endpoint);
    if (response.ok) {
      const result = await response.json();

      // Store all attributes in images array
      images.value = result.images.map((image: any) => ({
        s3_url: image.s3_url || "",
        vehicle_brand: image.vehicle_brand || "Unknown Brand",
        vehicle_model: image.vehicle_model || "Unknown Model",
        model_year: Number(image.model_year) || 0,
        vehicle_type: image.vehicle_type || "Unknown Type",
      }));

      console.log("✅ Loaded Images:", images.value);
    } else {
      console.error("❌ Failed to fetch images:", response.statusText);
    }
  } catch (error) {
    console.error("❌ Error fetching images:", error);
  }
};

// ✅ Update Selected Image with Vehicle Info
const updateData = (image: { s3_url: string; vehicle_brand: string; vehicle_model: string; model_year: int }) => {
  if (selectedImage.value === image.s3_url) {
    selectedImage.value = null;
    data.value = null; // Clear response when deselecting
  } else {
    selectedImage.value = image.s3_url;
    data.value = `Selected Vehicle: ${image.vehicle_brand} - ${image.vehicle_model} ${image.model_year}`;
  }
};

const loadData = async () => {
  if (!userInput.value.trim()) {
    alert("❌ Please enter a question!");
    return;
  }

  console.log("🚀 Validating Image in DynamoDB before sending to GPT...");

  if (!selectedImage.value) {
    alert("❌ No image selected!");
    return;
  }

  const requestBody = {
    input: userInput.value,
    selectedImage: selectedImage.value,
  };

  try {
    const response = await fetch(`${API_GATEWAY_BASE_URL}/gpt-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    console.log("🛠️ Debugging OpenAI Response:", result);

    if (!result.body) {
      data.value = "No valid response from AI.";
      return;
    }

    // ✅ Fix: Ensure we correctly parse the response body
    let parsedBody;
    try {
      parsedBody = typeof result.body === "string" ? JSON.parse(result.body) : result.body;
    } catch (error) {
      console.error("❌ Error parsing OpenAI response body:", error);
      parsedBody = {};
    }

    data.value = parsedBody.message || "No response from AI.";

  } catch (error) {
    console.error("❌ Error fetching data:", error);
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
/* 🔹 Styling */
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

.chat-response {
  display: flex;
  justify-content: flex-start; /* Align like a chat */
  margin-top: 10px;
  padding: 10px;
}

.chat-bubble {
  max-width: 100%;
  background-color: #343434; /* Light gray background */
  border-radius: 10px;
  padding: 15px;
  box-shadow: 2px 4px 10px rgba(0, 0, 0, 0.1);
  font-size: 16px;
  color: #ffffff;
  line-height: 1.5;
  word-wrap: break-word;
}

.chat-text {
  display: block;
  white-space: pre-line; /* Ensures line breaks appear */
}
</style>