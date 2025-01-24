<template>
  <div id="app">
    <header>
      <h1>BAY-AUTO Chatbot</h1>
    </header>
    <main>
      <p>Powered by ChatGPT API</p>
      <div>
        <!-- Dynamically display images -->
        <img
          v-for="image in images"
          id="carImage"
          :key="image"
          :src="`http://localhost:3000/automobile/${image}`"
          :alt="image"
          type="image"
          @click="updateData(image)"
        />
      </div>
      <input
        type="text"
        v-model="userInput"
        placeholder="Type your question for GPT..."
        @keyup.enter="loadData"
      />
      <button @click="loadData">Ask BAY-NANA</button>
      <div v-if="data">
        <pre>{{ data }}</pre>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";

export default {
  name: "App",
  setup() {
    const images = ref<string[]>([]); // Array of images
    const data = ref<string | null>(null); // Stores pre-prompt or GPT response
    const userInput = ref<string>(""); // User input for the chatbot
    const selectedImage = ref<string | null>(null); // Currently selected image name

    // Fetch the list of images from the backend
    const fetchImages = async () => {
      try {
        const response = await fetch("http://localhost:3000/list-images");
        if (response.ok) {
          const result = await response.json();
          images.value = result.images; // Update images array
        } else {
          console.error("Failed to fetch images:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    // Updates data when an image is clicked
    const updateData = (image: string) => {
      // Remove the file extension from the image name
      const prePrompt = image.replace(/\.(png|jpg|jpeg)$/i, "");
      data.value = `Selected Automobile: ${prePrompt}`;
      selectedImage.value = prePrompt; // Store the selected image name
    };

    // Handles the chatbot question logic
    const loadData = async () => {
      if (!userInput.value) {
        alert("Please enter a question!");
        return;
      }

      // Add pre-prompt for automobile-related questions
      const prePrompt = selectedImage.value
        ? `Automobile Context: ${selectedImage.value}. `
        : "";

      // If the question is unrelated to automobiles, ignore it
      if (!selectedImage.value && !userInput.value.toLowerCase().includes("car")) {
        data.value = "This question is not related to automobiles. Please select a car or ask a car-related question.";
        return;
      }

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

          // Check if the result has valid data
          if (result.choices && result.choices.length > 0) {
            data.value = result.choices[0].message.content.trim(); // Accessing the correct property
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

    // Fetch images when the component is mounted
    onMounted(() => {
      fetchImages();
    });

    return {
      images,
      data,
      userInput,
      loadData,
      updateData,
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
  background-color: #d1b239;
  padding: 20px;
}

header h1 {
  color: white;
}

button {
  background-color: #d1b239;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
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

img {
  width: 200px;
  margin: 10px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

img:hover {
  cursor: pointer;
  box-shadow: #d1b239 1px 1px 10px;
}
</style>
