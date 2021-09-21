import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Profile = () => {
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();

    useEffect(() => {
        const accessProtectedInformation = async () => {
            const domain = "dev-apjz4h14.us.auth0.com";

            try {
                const accessToken = await getAccessTokenSilently({
                    audience: `https://${domain}/api/v2/`,
                    scope: "read:current_user",
                });

                const userDetailsByIdUrl = `http://localhost:8080/api/protected`;
                const metadataResponse = await fetch(userDetailsByIdUrl, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                const res = await metadataResponse.json();
                console.log(res)

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

            </div>
        )
    );
};

export default Profile;