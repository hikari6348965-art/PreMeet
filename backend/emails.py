def reminder_email(name, title, day, month, time):
    return f"""
        Hi ${name},

        Just a quick reminder that you have an upcoming meeting:

        Meeting Title - ${title}  
        ${day}th ${month} scheduled at ${time}

        A little preparation can go a long way. Take a moment to review what you want to accomplish, and you'll be ready to make the most of the conversation.

        You've got this — go make the meeting count.

        Best,  
        The PreMeet Team
    """
def immediate_reminder(name, title, day, month, time):
    return f"""
        Hi ${name},

        It's meeting day! Just a quick reminder that your meeting is scheduled for today.

        Title - ${title}  
        📅 Today, ${day} ${month} 
        🕐 ${time}

        Take a moment to gather your thoughts, revisit your key talking points, and get ready to make this conversation count.

        You've prepared for this. Now go make a great impression!

        Wishing you a productive meeting,

        The PreMeet Team
    """