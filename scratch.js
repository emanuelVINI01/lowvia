const extractToolCalls = (text) => {
  const regex = /<(?:tool_call|tool)>\s*([\s\S]*?)(?:\s*<\/(?:tool_call|tool)>|\s*<\/?tool_result>|$)/g;
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return [];
  const parsedCalls = [];
  for (const match of matches) {
    let jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && typeof parsed.arguments === 'object') { parsedCalls.push(parsed); continue; }
    } catch (e) {
      try {
        jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1');
        jsonStr = jsonStr.replace(/'/g, '"');
        const parsed = JSON.parse(jsonStr);
        if (parsed.name && typeof parsed.arguments === 'object') { parsedCalls.push(parsed); }
      } catch (err) {
        const xmlMatch = jsonStr.match(/<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/);
        if (xmlMatch) {
          const toolName = xmlMatch[1];
          const innerArgs = xmlMatch[2];
          const args = {};
          const argRegex = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
          let argMatch;
          while ((argMatch = argRegex.exec(innerArgs)) !== null) {
            const key = argMatch[1];
            let val = argMatch[2].trim();
            if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
              try { val = JSON.parse(val); } catch {}
            } else if (val === 'true') { val = true; } else if (val === 'false') { val = false; }
            args[key] = val;
          }
          if (Object.keys(args).length > 0) {
            parsedCalls.push({ name: toolName, arguments: args });
            continue;
          }
        }
        parsedCalls.push({ name: '_syntax_error', arguments: { error: 'failed' } });
      }
    }
  }
  return parsedCalls;
};

const xml1 = `<tool_call>
<generate_file>
<filename>ai_python_advantages.md</filename>
<content># AI with Python: Advantages and Libraries

Python has become the dominant language in the field of Artificial Intelligence (AI) and Machine Learning (ML) for several compelling reasons. Its simplicity, extensive libraries, and strong community support make it an ideal choice for developers of all levels. This document outlines key advantages of using Python for AI development and highlights popular libraries that facilitate these endeavors.

## Advantages of Using Python for AI Development

*   **Simplicity and Readability:** Python's clear syntax closely resembles natural language, making it easy to learn and use. This reduces development time and enhances code maintainability.
*   **Extensive Libraries and Frameworks:** A wealth of libraries are available for various AI tasks, simplifying complex operations and accelerating development.
*   **Large and Active Community:** Python boasts a vibrant community of developers who provide ample support, resources, and solutions to common challenges.
*   **Platform Independence:** Python code can run on various operating systems (Windows, macOS, Linux) without requiring modifications, ensuring portability.
*   **Rapid Prototyping:** Python's dynamic nature allows for quick prototyping and experimentation, enabling faster iteration and innovation.

## Popular Libraries for AI and Machine Learning in Python

### Core Libraries

*   **NumPy:** Essential for numerical computing, providing powerful array operations and mathematical functions.
    [NumPy Documentation](https://numpy.org/)
*   **Pandas:** Enables efficient data manipulation and analysis using DataFrames, making it ideal for data preprocessing.
    [Pandas Documentation](https://pandas.pydata.org/)
*   **Matplotlib:** Provides a comprehensive suite of tools for creating static, interactive, and animated visualizations.
    [Matplotlib Documentation](https://matplotlib.org/)
*   **Scikit-learn:** A versatile library offering a wide range of machine learning algorithms for classification, regression, clustering, and more.
    [Scikit-learn Documentation](https://scikit-learn.org/stable/)

### Deep Learning Frameworks

*   **TensorFlow:** A powerful open-source framework developed by Google for building and deploying deep learning models.
    [TensorFlow Documentation](https://www.tensorflow.org/)
*   **PyTorch:** Another popular open-source framework favored for its flexibility, ease of use, and dynamic computation graph.
    [PyTorch Documentation](https://pytorch.org/)

### Natural Language Processing (NLP) Libraries

*   **NLTK (Natural Language Toolkit):** A comprehensive library for NLP tasks, including tokenization, stemming, tagging, parsing, and more.
    [NLTK Documentation](https://www.nltk.org/)
*   **spaCy:** An industrial-strength NLP library known for its speed and efficiency in tasks like named entity recognition and dependency parsing.
    [spaCy Documentation](https://spacy.io/)

### Computer Vision Libraries

*   **OpenCV (cv2):** A powerful library for image processing, computer vision tasks, and real-time video analysis.
    [OpenCV Documentation](https://docs.opencv.org/)

### Other Useful Libraries

*   **Statsmodels:** Provides statistical modeling tools, including regression analysis and time series analysis.
    [Statsmodels Documentation](https://www.statsmodels.org/stable/index.html)
*   **Seaborn:** A high-level data visualization library built on top of Matplotlib, offering aesthetically pleasing and informative statistical graphics.
    [Seaborn Documentation](https://seaborn.pydata.org/)

## Resources for Learning AI with Python

*   [Official Python Tutorial](https://docs.python.org/3/tutorial/)
*   [Scikit-learn Documentation](https://scikit-learn.org/stable/)
*   [TensorFlow Tutorials](https://www.tensorflow.org/tutorials)
*   [PyTorch Tutorials](https://pytorch.org/tutorials/)
*   [Kaggle](https://www.kaggle.com/) - A platform for data science competitions and collaborative learning.



</content>
</generate_file>
</tool_call>`;

console.log(JSON.stringify(extractToolCalls(xml1), null, 2));
