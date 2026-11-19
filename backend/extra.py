import requests
from urllib.parse import quote
from database import db
from datetime import datetime
import os

def refresh_front_token(refresh_token):
    clientID = os.getenv("FRONT_MAIL_CLIENTID ")
    clientSeceret = os.getenv("FRONT_MAIL_SECERET")
    data={
        "grant_type": "refresh_token",
         "refresh_token": refresh_token
    }
    response = requests.get("https://app.frontapp.com/oauth/token", auth=(clientID, clientSeceret), data=data) #type: ignore
    if response.status_code == 401:
        return False
    return response.json()

def get_front_conversations_by_email(access_token, email):
    query = f"recipient:{email}"
    encoded_query = quote(query, safe="")
    response = requests.get(
        f"https://api2.frontapp.com/conversations/search/{encoded_query}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        },
        params={"limit": 100}
    )
    if response.status_code == 401:
        return False
    return response.json()

def get_front_messages(access_token, conversation_id):
    response = requests.get(
        f"https://api2.frontapp.com/conversations/"
        f"{conversation_id}/messages",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
    )
    if response.status_code == 401:
        return False
    return response.json()

def extract_results(data):
    """
    Front collection responses may contain results
    inside _results. Handle both wrapped and list responses.

    """
    if isinstance(data, list):
        return data
    return data.get("_results", data.get("results", []))

async def get_front_notes(access_token, refresh_token, emails, userID):

    notes = []
    seen_messages = set()

    for email in emails:
        conversations_data = get_front_conversations_by_email(access_token, email)
        if conversations_data == False:
            # Get new acccess and refresh tokens and save them in databse
            tokens = refresh_front_token(refresh_token=refresh_token)
            if tokens != False:
                accessToken = tokens["access_token"]
                refreshToken = tokens["refresh_token"]
                await db.integrations.update_one(
                    {"user_id": userID, "status": "connected", "provider": "front"},
                    {
                        "$set": {
                            "access_token": accessToken,
                            "refresh_token": refreshToken
                        }
                    }
                )
                # Re-run the function
                conversations_data = get_front_conversations_by_email(accessToken, email=email)
        else:
            conversations = conversations_data.get("_results", [])
            for conversation in conversations:
                conversation_id = conversation["id"]
                messages_data = get_front_messages(access_token, conversation_id)
                if messages_data == False:
                    # Get new acccess and refresh tokens and save them in databse
                    tokens = refresh_front_token(refresh_token=refresh_token)
                    if tokens != False:
                        accessToken = tokens["access_token"]
                        refreshToken = tokens["refresh_token"]
                        await db.integrations.update_one(
                            {"user_id": userID, "status": "connected", "provider": "front"},
                            {
                                "$set": {
                                    "access_token": accessToken,
                                    "refresh_token": refreshToken
                                }
                            }
                        )
                        # Re-run the function
                        messages_data = get_front_messages(accessToken, conversation_id)
                else:
                    messages = messages_data.get("_results", [])
                    for message in messages:
                        message_id = message.get("id")
                        # Avoid duplicate messages across email searches
                        if message_id in seen_messages:
                            continue
                        seen_messages.add(message_id)
                        notes.append({
                            "source_type": "front",
                            "title": message.get("subject") or "Front conversation",
                            "created_at": message.get("created_at"),
                            "content": (
                                f"Related email: {email}\n"
                                f"From: {message.get('sender')}\n"
                                f"Content: {message.get('text') or message.get('blurb') or ''}"
                            )
                        })
            return notes

async def get_all_users(exclusion = []):
    # get the initial batch of users
    exclusion_ids = []
    users = await db.users.find({"_id": {"$nin": exclusion}}).to_list(100)

    user_data_arr = []
    while users:
        for user in users:
            exclusion_ids.append(user["_id"])
            data = {
                "email": user["email"],
                "name": user["name"],
                "user_id": user["_id"]
            }
            user_data_arr.append(data)
        users_arr = await get_all_users(exclusion_ids)
        user_data_arr.append(users_arr)
    return user_data_arr

def extract_date_info(string: str):
    date = datetime.fromisoformat(string.replace("Z", "+00:00"))
    return {
        "day": date.day,
        "month": date.month,
        "year": date.year
    }
        