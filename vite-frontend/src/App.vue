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
          <li class="nav-item" @click="showImages('motorcycles')">Motorcycles</li>
        </ul>
        <h3 @click="toggleNav">X</h3>
      </div>

      <main class="content">
        <p>Powered by ChatGPT API</p>
        <div
          class="car-image-container"
          :class="{ 'column-layout': selectedImage }"
        >
          <div
            v-for="image in images"
            :key="image"
            class="image-wrapper"
          >
            <img
              :src="image"
              :alt="image"
              class="car-image"
              :class="{ selected: selectedImage === image }"
              @click="updateData(image)"
            />
            <div v-if="selectedImage === image" class="input-container">
              <input
                type="text"
                v-model="userInput"
                placeholder="Type your question for GPT..."
                @keyup.enter="loadData"
              />
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

<script lang="ts">
import { ref } from "vue";

export default {
  name: "App",
  setup() {
    const images = ref<string[]>([]); 
    const data = ref<string | null>(null); 
    const userInput = ref<string>(""); 
    const selectedImage = ref<string | null>(null);
    const showNav = ref<boolean>(false); 

    const fetchImages = async (category: string) => {
      let endpoint = "";

      if (category === "cars") {
        endpoint = "/list-images-cars";
      } else if (category === "motorcycles") {
        endpoint = "/list-images-motorcycles";
      } else {
        endpoint = "/list-images"; 
      }

      try {
        const response = await fetch(`http://47.129.37.247:3000${endpoint}`);
        if (response.ok) {
          const result = await response.json();
          if (result.images) {
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
      if (selectedImage.value === image) {
        data.value = null;
        selectedImage.value = null;
      } else {
        const prePrompt = image.split("/").pop()?.replace(/\.(png|jpg|jpeg)$/i, "") || "";
        data.value = `Selected Automobile: ${prePrompt}`;
        selectedImage.value = image;
      }
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
        ? `Automobile Context: ${selectedImage.value}. Please answer within 150 tokens. The model of the car is the automobile context. Ignore the url`
        : "Please answer within 150 tokens. ";

      try {
        const response = await fetch("http://47.129.37.247:3000/gpt-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: `${prePrompt}${userInput.value}` }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.choices && result.choices.length > 0) {
            data.value = result.choices[0].message.content.trim();
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
      selectedImage,
      showImages,
    };
  },
};
</script>

<style scoped>
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
  font-size: 24px;
  cursor: pointer;
  z-index: 0;
  font-size: 32px;
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
  transition: transform 0.3s ease-in-out, left 0.3s ease-in-out;
}

.side-nav.show {
  left: 0;
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

.content {
  flex: 1;
  padding: 20px;
  transition: margin-left 0.3s ease-in-out;
}

.content.hidden {
  margin-left: 0;
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

input {
  padding: 10px;
  margin: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

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

.car-image-container {
  display: flex;
  justify-content: center; 
  align-items: center; 
  flex-wrap: wrap; 
  gap: 20px; 
  transition: all 0.3s ease; 
}

.car-image-container.column-layout {
  flex-direction: column; 
  align-items: center; 
}

.car-image {
  width: 200px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease; 
}

.car-image:hover {
  cursor: pointer;
  box-shadow: #d1b239 1px 1px 10px;
}

@media (max-width: 768px) {
  .side-nav {
    width: 200px;
  }

  .content {
    margin-left: 200px;
  }
}

.input-container {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px; 
}

.input-container input {
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 80%; 
}

.input-container button {
  background-color: #d1b239;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.input-container button:hover {
  background-color: #bfa02c;
}

.car-image.selected {
  display: block;
  width: 70vw; 
  margin: 0 auto; 
  border: 2px solid #d1b239;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.car-image-container.column-layout .car-image:not(.selected) {
  opacity: 0.7; 
  transition: opacity 0.3s ease;
}

.car-image-container.column-layout .car-image:not(.selected):hover {
  opacity: 1; 
}
</style>
