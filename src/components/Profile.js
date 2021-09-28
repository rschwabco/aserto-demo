import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const [message, setMessage] = useState(false)
    
    useEffect(() => {
        const accessSensitiveInformation = async () => {
            const domain = process.env.REACT_APP_AUTH0_DOMAIN;

            try {
                const accessToken = await getAccessTokenSilently();

                const sensitiveInformationURL = `http://localhost:8080/api/protected`;
                const sensitiveDataResponse = await fetch(sensitiveInformationURL, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                try{
                    const res = await sensitiveDataResponse.json();
                    setMessage(res.secret)
                } catch (e){
                    //In case no access is given, the response will return 403 and not return a JSON response
                    setMessage("No access to sensitive information")
                }


            } catch (e) {
                console.log(e.message);
            }
        };

        accessSensitiveInformation();
    }, [getAccessTokenSilently, user?.sub]);


    return (
        isAuthenticated && (
            <div>
                <img src={user.picture} alt={user.name} />
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <p>{message}</p>
            </div>
        )
    );
};

export default Profile;