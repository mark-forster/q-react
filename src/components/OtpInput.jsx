import { HStack, Input } from "@chakra-ui/react";
import { useRef } from "react";

export default function OtpInput({ length = 6, value, onChange }) {
  const inputsRef = useRef([]);

  /* ===== LOGIC ===== */
  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;

    const otpArr = value.split("");
    otpArr[index] = val[0];
    onChange(otpArr.join(""));

    if (index < length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      const otpArr = value.split("");
      otpArr[index] = "";
      onChange(otpArr.join(""));
      if (index > 0) {
        inputsRef.current[index - 1].focus();
      }
    }
  };

  return (
    <HStack justify="center" spacing={3}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          value={value[index] || ""}
          maxLength={1}
          textAlign="center"
          fontSize="xl"
          fontWeight="bold"
          w="45px" 
          h="55px"
          borderRadius="lg"
          bg="white"
          color="black" 
          borderColor={value[index] ? "#0067b8" : "gray.300"} 
          borderWidth="2px"
          _placeholder={{ color: "gray.400" }}
          _hover={{ borderColor: "gray.400" }}
          _focus={{
            borderColor: "#0067b8",
            boxShadow: "0 0 0 1px #0067b8",
          }}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        />
      ))}
    </HStack>
  );
}