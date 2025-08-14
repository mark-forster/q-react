import React from 'react'
import {Text,Button} from '@chakra-ui/react'
import axios from 'axios'
import userLogout from '../hooks/userLogout'
import toast from 'react-hot-toast'
const SettingPage = () => {
    const logout= userLogout();
    const freezeAccount = async() => {
        if (!window.confirm("Are you sure you want to freeze your account?")) return;
        // Simulate freezing account
        const response= await axios.put('/api/v1/users/freeze');
        if(response.data.errorMessage){
            toast.error(response.data.errorMessage);
            return;
        }
        await logout();
        toast.success('Account frozen successfully');
        console.log('Account frozen')
    }
  return (
    <>
    <Text my={1} fontWeight={"bold"}>
				Freeze Your Account
			</Text>
			<Text my={1}>You can unfreeze your account anytime by logging in.</Text>
			<Button size={"sm"} colorScheme='red' 
            onClick={freezeAccount}
            >
				Freeze
			</Button>
    </>
  )
}

export default SettingPage