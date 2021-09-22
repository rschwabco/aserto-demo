import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
    const [sensitiveInformation, setSensitiveInformation] = useState(false)
    useEffect(() => {
        const accessProtectedInformation = async () => {
            const domain = "dev-apjz4h14.us.auth0.com";

            try {
                const accessToken = await getAccessTokenSilently({
                    audience: `https://${domain}/api/v2/`,
                    scope: "read:current_user",
                });

                const sensitiveInformationURL = `http://localhost:8080/api/protected`;
                const metadataResponse = await fetch(sensitiveInformationURL, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                const res = await metadataResponse.json();
                setSensitiveInformation(res.secret)

            } catch (e) {
                console.log(e.message);
            }
        };

        accessProtectedInformation();
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