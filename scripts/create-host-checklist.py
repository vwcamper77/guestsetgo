"""Generate the printable lead magnet. Uses the bundled Python reportlab runtime."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit

root = Path(__file__).resolve().parents[1]
target = root / 'assets' / 'guestsetgo-impress-your-guests.pdf'
target.parent.mkdir(exist_ok=True)
c = canvas.Canvas(str(target), pagesize=(595, 842))
c.setTitle('Impress your guests | GuestSetGo')
c.setAuthor('GuestSetGo')
ink, green, cream = map(HexColor, ['#173c3b', '#456d66', '#f6f1e7'])

def text(value, x, y, width=475, size=11, leading=16, font='Helvetica'):
    c.setFont(font, size)
    c.setFillColor(ink)
    for line in simpleSplit(value, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y

def page(number, title, subtitle):
    c.setFillColor(cream); c.rect(0, 0, 595, 842, fill=1, stroke=0)
    text('GuestSetGo', 48, 790, size=17, font='Helvetica-Bold')
    text('THE THOUGHTFUL HOST', 344, 792, size=10)
    c.setStrokeColor(green); c.line(48, 768, 547, 768)
    y = text(title, 48, 718, size=32, leading=38, font='Helvetica-Bold')
    y = text(subtitle, 48, y-15, size=12, leading=18)
    text('guestsetgo.com  |  A clearer guide. A warmer welcome.', 48, 42, size=9)
    text(str(number), 535, 42, size=9)
    return y-28

def section(title, items, y):
    y = text(title, 48, y, size=16, leading=22, font='Helvetica-Bold')-9
    for item in items:
        c.setStrokeColor(green); c.rect(49, y-1, 9, 9, fill=0, stroke=1)
        y = text(item, 69, y, width=472, size=11, leading=15)-5
    return y-5

y = page(1, 'Impress your guests.', 'A practical checklist for better stays, honest reviews and reasons to return. Choose three improvements before your next arrival.')
y = section('01 / Make arrival feel easy', [
    'Send parking, arrival time and clear entrance directions before the stay. Share access codes through your usual private booking message.',
    'Test the key safe and photograph the entrance as guests will see it. Include a useful contact for arrival problems.',
    'Check cleanliness, heating, lighting and Wi-Fi. Leave a short printed essentials sheet as a fallback.'
], y)
y = section('02 / Show a little thought', [
    'Leave a personal welcome note. If offering a treat, check preferences and label ingredients clearly.',
    'Recommend three places you know and explain who each suits. Check details before recommending them.',
    'Make the first evening simple: show where to find tea, towels, spare bedding and the nearest food options.'
], y)
y = section('03 / Answer before they ask', [
    'Photograph the actual heating, TV and appliance controls. Write one action per step, then test the instructions.',
    'Open every guide link on your phone. Put Wi-Fi, contact details and checkout time where guests can find them quickly.'
], y)
c.showPage()
y = page(2, 'Make the next stay\nan easy yes.'.replace('\n', ' '), 'Use the end of each stay to listen, improve and leave the door open.')
y = section('04 / Finish as warmly as you started', [
    'Keep checkout tasks short and proportionate. State the departure time and where keys and rubbish go.',
    'Thank every guest and invite an honest review through the appropriate booking channel. Give everyone the same opportunity; never tie rewards to a positive review.',
    'Respond constructively to feedback and fix recurring problems. Ask permission before sharing a guest quote publicly.'
], y)
y = section('05 / Give them a reason to return', [
    'Mention a season or local experience they might enjoy next time. Keep any offer clear and realistic.',
    'Invite guests to opt in to future news. Use only permitted contact channels and respect booking-platform terms and guest preferences.',
    'Review repeated questions after each stay and update one part of your guide before the next arrival.'
], y)
y = text('A simple thank-you message', 48, y, size=16, font='Helvetica-Bold')-10
y = text('Thank you for staying at [property]. We hope you felt at home. If you have a moment, please share an honest review through [booking channel]. We would love to welcome you back - [season or experience] is a lovely reason to visit again. Warm wishes, [host].', 48, y, size=11, leading=16)-22
y = text('Your next three improvements:', 48, y, size=12, font='Helvetica-Bold')-22
for i in range(3):
    c.setStrokeColor(green); c.line(48, y, 547, y); y -= 19
y = text('Turn your checklist into a guide guests can use.', 48, y-2, size=14, font='Helvetica-Bold')-8
text('Try GuestSetGo: photo instructions, arrival essentials and local favourites in one browser guide. Explore guestsetgo.com. Results depend on the stay you provide; reviews and repeat bookings are not guaranteed.', 48, y, size=10, leading=14)
c.save()
print(target)
