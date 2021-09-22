import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const [sensitiveInformation, setSensitiveInformation] = useState(false)
    useEffect(() => {
        const accessSensitiveInformation = async () => {
            const domain = process.env.REACT_APP_AUTH0_DOMAIN;

            try {
                const accessToken = await getAccessTokenSilently({
                    audience: `https://${domain}/api/v2/`,
                    scope: "read:current_user",
                });

                const sensitiveInformationURL = process.env.REACT_APP_PROTECTED_API;
                const sensitiveDataResponse = await fetch(sensitiveInformationURL, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                const res = await sensitiveDataResponse.json();
                setSensitiveInformation(res.secret)

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
                <p>{sensitiveInformation || 'No access to sensitive information'}</p>
            </div>
        )
    );
};

export default Profile;