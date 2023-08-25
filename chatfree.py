from flask import Flask, request, jsonify
from transformers import GPTNeoForCausalLM, GPT2Tokenizer

app = Flask(__name__)

model_name = "EleutherAI/gpt-neo-1.3B"
model = GPTNeoForCausalLM.from_pretrained(model_name)
tokenizer = GPT2Tokenizer.from_pretrained(model_name)

@app.route('/generate', methods=['POST'])
def generate():
    text = request.json['text']
    input_ids = tokenizer.encode(text, return_tensors='pt')
    output = model.generate(input_ids, max_length=150)
    generated_text = tokenizer.decode(output[0], skip_special_tokens=True)
    return jsonify({'generated_text': generated_text})

if __name__ == '__main__':
    app.run(port=5001)  # This will run on a different port than your Express app
