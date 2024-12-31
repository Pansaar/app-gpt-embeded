<template>
  <div id="app">
    <header>
      <h1>Welcome to My Vue + Elysia App</h1>
    </header>
    <main>
      <p>This app is powered by Vue.js and served by Elysia!</p>
      <input
        type="text"
        v-model="userInput"
        placeholder="Type your question for GPT..."
        @keyup.enter="loadData"
      />
      <button @click="loadData">Ask GPT</button>
      <div v-if="data">
        <h2>Response from GPT:</h2>
        <pre>{{ data }}</pre>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { ref } from "vue";

export default {
  name: "App",
  setup() {
    const data = ref<any>(null);
    const userInput = ref<string>("");

    const loadData = async () => {
      if (!userInput.value) {
        alert("Please enter a question!");
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/gpt-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: userInput.value }),
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

    return {
      data,
      userInput,
      loadData,
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
  background-color: #42b983;
  padding: 20px;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #369b74;
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
  font-size: 16px; /* Adjust font size for readability */
  text-align: left; /* Ensure text alignment */
  color: white; /* Set text color */
  overflow-x: auto; /* Allow horizontal scrolling if needed */
  white-space: pre-wrap; /* Preserve line breaks and allow text wrapping */
}
</style>
