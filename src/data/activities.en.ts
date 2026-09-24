import type { Activity } from '../contracts';

/** Text only: IDs and recommendation metadata stay in the Chinese source catalog. */
export const englishText: Record<string, Pick<Activity, 'title' | 'environment' | 'variants'>> = {};
function text(id: string, title: string, environment: string, one: string[], three: string[], ten: string[]) {
  englishText[id] = { title, environment, variants: {
    1: { intro: 'Try one minute. You can stop at any time.', steps: one },
    3: { intro: 'Give this small thing three minutes. It does not have to be perfect.', steps: three },
    10: { intro: 'Take ten minutes for yourself. Finishing early is fine.', steps: ten },
  } };
}
text('detach-colors', 'Notice the colors around you', 'Somewhere safe to pause and look around',
 ['Look away from the screen.', 'Find three objects of the same color and name them silently.'],
 ['Choose a color you can see.', 'Slowly find five objects of that color and notice their shapes.', 'Let your eyes rest on a pleasant spot.'],
 ['Notice three colors nearby.', 'Look at the outlines of objects farther away. There is no number to reach.', 'Spend the remaining time looking around. If your mind wanders, notice one object again.']);
text('detach-window', 'Look out of a window', 'A window or a safe view into the distance; avoid looking directly at the sun',
 ['Choose a still object in the distance.', 'Notice its edges without analyzing it.'],
 ['Look into the distance from your seat.', 'Notice a change in light or shadow, then look at the sky or a building.'],
 ['Find a comfortable position.', 'Alternate between nearby and distant scenery.', 'Look wherever you like. If your eyes feel tired, close them briefly.']);
text('detach-phone', 'Let your phone rest', 'A safe place where messages can wait',
 ['Start the timer, then put your phone face down.', 'Rest your hands on your lap. Replies can wait for a moment.'],
 ['Put your phone out of reach but within hearing distance.', 'Look around and let information wait for a little while.'],
 ['Set aside these ten minutes.', 'Put your phone face down and sit or lean comfortably.', 'If you want to check it, touch your sleeve first, then decide whether to keep resting.']);
text('detach-walk', 'Change the scenery a little', 'A clear, level indoor route, if walking feels comfortable',
 ['Put down what you are doing.', 'Walk slowly to the doorway and back.'],
 ['Choose a short route without obstacles.', 'Walk a small loop at a comfortable pace and notice your footsteps.'],
 ['Choose a familiar, safe route. Keep your eyes off the screen while walking.', 'Walk a few slow loops and notice changes in the light.', 'Return to your starting point and sit for a moment.']);
text('relax-shoulders', 'Let your shoulders soften', 'A comfortable place to sit',
 ['Give your feet some support.', 'Let your jaw and shoulders relax while breathing naturally.'],
 ['Find a supported sitting position.', 'Gently move your fingers, then let your palms open.', 'Relax your shoulders without stretching into pain.'],
 ['Sit with support and breathe naturally.', 'Notice whether your jaw, shoulders and hands could use a little less effort.', 'Sit quietly for the remaining time. Change position or stop if uncomfortable.']);
text('relax-sounds', 'Listen to nearby sounds', 'Somewhere without harsh noise; no headphones needed',
 ['Listen for the closest sound.', 'Then notice a sound farther away.'],
 ['Put down the screen.', 'Listen to nearby, distant and occasional sounds without needing to name them.'],
 ['Find a comfortable position.', 'Notice sounds arriving and fading.', 'When your mind wanders, listen for one sound again. Move or stop if it is too noisy.']);
text('relax-hands', 'Give your hands a break', 'Somewhere to sit with your hands free',
 ['Put down anything you are holding.', 'Rest your palms on your lap, slowly open them, then relax.'],
 ['Look at your fingers.', 'Gently open and close your hands a few times within a comfortable range, then let them rest.'],
 ['Support your forearms.', 'Occasionally move your fingers slowly and let your hands rest between movements.', 'Stop if uncomfortable and find a better resting position.']);
text('relax-rest', 'Lean back and rest', 'A stable chair or another safe, supported seat',
 ['Let your body lean against its support.', 'Breathe naturally and do nothing for a moment.'],
 ['Adjust to a comfortable sitting position.', 'Look at a quiet corner or gently close your eyes.', 'Wait for the timer before slowly getting up.'],
 ['Support your body and change position if needed.', 'You do not need to fall asleep or empty your mind.', 'Move your fingers before slowly returning to activity.']);
text('control-notice', 'Turn off one optional alert', 'Your phone; keep important ways of reaching you available',
 ['Choose one non-urgent app.', 'Temporarily turn off its notifications or simply close it.'],
 ['Choose one unnecessary alert that interrupts you.', 'Turn it off while keeping essential contact available.', 'Put down your phone and try a moment of quiet.'],
 ['Adjust notifications for just one non-essential app.', 'Note any setting you want to restore later.', 'Leave the settings page and rest instead of continuing to organize your phone.']);
text('control-later', 'Write down one thing for later', 'Paper and a pen or a local notes app',
 ['Write down one thing on your mind.', 'Add: "Look at this after resting."'],
 ['Write down up to three things that can wait.', 'Circle one to leave for later, then close the note.'],
 ['List up to three things occupying your mind.', 'Mark each "Later" or "Need some help."', 'Close the note and leave the rest of the time for rest.']);
text('control-choice', 'Choose a comfortable spot', 'A safe seat or somewhere you can adjust your posture',
 ['Choose to stay seated or shift your position slightly.', 'Make that choice without needing to explain it.'],
 ['Notice whether your seat and the light feel comfortable.', 'Change just one thing: posture, distance or direction.', 'Stay in the new position for a while.'],
 ['Choose a spot where you would like to stay.', 'Adjust your posture or the light without moving anything heavy.', 'The remaining time is yours. Sitting quietly counts.']);
text('control-space', 'Make a little room for a cup', 'A small patch of a table; leave heavy and valuable items alone',
 ['Choose a patch the size of a cup.', 'Move one or two things, then stop there.'],
 ['Choose a small patch of the table nearby.', 'Put loose items in one spot beside it.', 'Leave the space clear without expanding the task.'],
 ['Choose just a small patch, not the whole room.', 'Slowly move a few objects to reveal some empty space.', 'If you finish early, sit and enjoy the space.']);
text('mastery-line', 'Draw a wandering line', 'Paper and a pen or an offline drawing tool',
 ['Draw a freely curving line.', 'Add a little dot.'],
 ['Draw three different kinds of lines.', 'Add a few marks to one and let it resemble anything that comes to mind.'],
 ['Start with one line.', 'Slowly add shapes without erasing or grading them.', 'Give your little drawing a name only you need to understand.']);
text('mastery-fold', 'Fold a small corner', 'A spare sheet of paper; no scissors needed',
 ['Fold over one corner of the paper.', 'Notice the crease and its shadows.'],
 ['Fold the paper in half, then unfold it.', 'Try folds in different directions without needing a finished object.'],
 ['Fold a few corners in a scrap of paper.', 'Try making it stand. If it falls, try another fold.', 'Stop when the time is up. You can recycle the result.']);
text('mastery-read', 'Read a little of something you like', 'A book or offline text you already have',
 ['Find a short passage in something you have.', 'Read two or three sentences slowly. No need to memorize them.'],
 ['Choose half a page you want to read.', 'After reading, pause on an interesting word.'],
 ['Choose one or two pages of something light.', 'Read at your own pace and pause wherever you like.', 'Notes are optional. Close it when the time is up.']);
text('mastery-rhythm', 'Tap a little rhythm', 'Somewhere you will not disturb others',
 ['Lightly tap your leg with your fingertips.', 'Try a rhythm of two or three beats.'],
 ['Tap a short rhythm softly.', 'Change the speed once, then pause and listen to the quiet.'],
 ['Start with two very gentle beats.', 'Vary the gaps and repeat a short pattern you like.', 'Stop if your hands feel tired and listen to your surroundings.']);
text('connect-think', 'Think of someone you feel at ease with', 'Being alone is fine; no message needed',
 ['Think of someone around whom you can be yourself.', 'Recall an ordinary, comfortable moment. If none comes to mind, you can stop.'],
 ['Recall a moment when you felt accepted.', 'Notice a word or gesture from it. You do not need to contact anyone.'],
 ['Choose a comfortable memory with someone, including an animal.', 'Slowly recall the surroundings.', 'If this feels uncomfortable, look at objects around you instead. You do not need to keep remembering.']);
text('connect-message', 'Send a message that can wait', 'A trusted contact you already know; sending is optional',
 ['Choose someone you trust.', 'You could write "Thinking of you. No rush to reply," or keep it as a draft.'],
 ['Write a short update you would like to share.', 'Add "No rush to reply" and choose whether to send or save it.', 'Put down your phone without waiting for a reply.'],
 ['Write a brief update to someone you trust.', 'Remove anything you feel obliged to explain.', 'Send it or keep a draft, then rest. Receiving a reply is not part of completing this activity.']);
text('connect-nature', 'Look at a leaf', 'A nearby plant, a tree outside or a nature photo you already have',
 ['Find a leaf or a plant in a photo.', 'Notice its outline.'],
 ['Observe the colors and veins of a leaf.', 'Leave it on the plant and notice just one detail.'],
 ['Sit where you can see a plant or a nature photo.', 'Slowly look at shapes, light and shadow.', 'No tending or photography needed. Just spend a little time with it.']);
text('connect-company', 'Share a quiet moment', 'A willing friend or familiar pet; a familiar photo is another option',
 ['Check that the other person is willing, or choose a familiar photo.', 'Spend a quiet minute without needing a conversation.'],
 ['Ask whether you can sit quietly together for a while.', 'If a pet does not want to approach, leave it be. You can look at a photo instead.'],
 ['Agree on a short quiet moment with someone willing, or look at a familiar photo.', 'Each of you can do something comfortable. Conversation is optional.', 'Let the moment end naturally when the time is up.']);
text('meaning-word', 'Keep a word you like', 'Paper, a notes app or just your thoughts',
 ['Choose a word you would like to keep.', 'Write it down or say it silently once.'],
 ['Choose a word or phrase, such as "Slow down."', 'Think of one small thing it could mean today.'],
 ['Write a word you feel drawn to right now.', 'Add a few associations without needing a lesson.', 'Keep one sentence and cross out anything else if you like.']);
text('meaning-moment', 'Keep an ordinary moment', 'Paper and a pen or a local notes app',
 ['Think of a small detail you noticed today.', 'Write one sentence about it. It does not have to be positive.'],
 ['Recall an ordinary moment from today.', 'Write down what you saw or heard without judging yourself.'],
 ['Choose a moment from today that you still remember.', 'Write a few lines about the surroundings and how you felt.', 'Read it once, then close it. You do not need to find a positive meaning.']);
text('meaning-kind', 'Offer yourself a little room', 'Anywhere safe to pause',
 ['Silently say, "I can rest for a moment."', 'Change the words to something you can comfortably say.'],
 ['Think of what you would say to a tired friend.', 'Keep one of those sentences for yourself. You do not have to force yourself to believe it.'],
 ['Write down one difficulty you are facing.', 'Beside it, write a response without blaming yourself.', 'Rest for the remaining time instead of continuing to analyze the problem.']);
text('meaning-imagine', 'Imagine a little corner', 'A quiet place to sit; paper and a pen are optional',
 ['Imagine a corner where you would like to spend time.', 'Put a comfortable chair in it.'],
 ['Imagine the light and colors in this corner.', 'Add one thing you like without considering cost or how to make it real.'],
 ['Draw or imagine a little corner.', 'Slowly add light, a seat and objects you like.', 'Leave some empty space. This is enough.']);
