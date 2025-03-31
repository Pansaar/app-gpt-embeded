<script setup lang="ts">
import { ref } from 'vue';

const selectedCategory = ref<"Car" | "Motorcycle" | "">("");
const vehicleBrand = ref("");
const vehicleModel = ref("");
const modelYear = ref("");
const imageFile = ref<File | null>(null);
const imagePreview = ref<string | null>(null);

const API_GATEWAY_BASE_URL = "https://z29mmvkyfj.execute-api.ap-southeast-1.amazonaws.com/prod";

// 🔹 Handle Image Upload Preview
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] || null;
  imageFile.value = file;

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      imagePreview.value = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const submitFormToLambda = async () => {
  if (!imageFile.value) {
    alert("❌ Please select an image to upload.");
    return;
  }

  const reader = new FileReader();

  reader.onload = async () => {
    const base64Image = (reader.result as string).split(',')[1];
    const folder = selectedCategory.value.toLowerCase() + "s"; // "cars" or "motorcycles"
    const fileKey = `${folder}/${imageFile.value?.name}`;

    const body = {
      vehicle_type: selectedCategory.value,
      vehicle_brand: vehicleBrand.value,
      vehicle_model: vehicleModel.value,
      model_year: modelYear.value,
      image: base64Image,
      image_filename: fileKey, // e.g., "cars/toyota.jpg"
    };

    try {
      const response = await fetch(`${API_GATEWAY_BASE_URL}/add-vehicle`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      console.log("✅ Uploaded:", result);
      alert("✅ Vehicle and image uploaded successfully!");
    } catch (error) {
      console.error("❌ Error:", error);
      alert("❌ Failed to upload.");
    }
  };

  reader.readAsDataURL(imageFile.value);
};

// 🔹 Input Handlers
const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedCategory.value = target.value as "Car" | "Motorcycle";
};

const handleVehicleBrandChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  vehicleBrand.value = target.value;
};

const handleVehicleModelChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  vehicleModel.value = target.value;
};

const handleModelYearChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  modelYear.value = target.value;
};
</script>


<template>
    <form @submit.prevent="submitFormToLambda">
      <select @change="handleCategoryChange">
        <option disabled value="">Select Category</option>
        <option>Car</option>
        <option>Motorcycle</option>
      </select>
  
      <input placeholder="Enter vehicle brand" @input="handleVehicleBrandChange" />
      <input placeholder="Enter vehicle model" @input="handleVehicleModelChange" />
      <input placeholder="Enter year model" @input="handleModelYearChange" />
  
      <!-- 🔹 Image Upload -->
      <input type="file" accept="image/*" @change="handleImageUpload" />
      <img
        v-if="imagePreview"
        :src="imagePreview"
        alt="Image Preview"
        style="max-width: 200px; margin-top: 10px;"
      />
  
      <button type="submit">Add Vehicle</button>
    </form>
  </template>
  
  
