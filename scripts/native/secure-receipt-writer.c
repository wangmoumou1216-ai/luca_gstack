#define _DARWIN_C_SOURCE 1
#define _GNU_SOURCE 1
#define _POSIX_C_SOURCE 200809L

#include <sys/stat.h>
#include <sys/types.h>

#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#ifndef O_CLOEXEC
#define O_CLOEXEC 0
#endif

#ifndef AT_SYMLINK_NOFOLLOW
#error "secure-receipt-writer requires AT_SYMLINK_NOFOLLOW"
#endif

#ifndef O_DIRECTORY
#error "secure-receipt-writer requires O_DIRECTORY"
#endif

#ifndef O_NOFOLLOW
#error "secure-receipt-writer requires O_NOFOLLOW"
#endif

enum {
    EXIT_USAGE_ERROR = 64,
    EXIT_DATA_ERROR = 65,
    EXIT_PUBLICATION_ERROR = 73,
    EXIT_IO_ERROR = 74,
    MAX_SEGMENTS = 16,
    MAX_SAFE_SEGMENT_BYTES = 255,
    COPY_BUFFER_BYTES = 65536
};

struct options {
    const char *root;
    uintmax_t root_dev;
    uintmax_t root_ino;
    bool have_root_dev;
    bool have_root_ino;
    const char *segments[MAX_SEGMENTS];
    size_t segment_count;
    const char *final_name;
    const char *input;
    uint8_t expected_sha256[32];
    char expected_sha256_hex[65];
    bool have_expected_sha256;
};

struct identity {
    dev_t dev;
    ino_t ino;
};

struct directory_handle {
    int fd;
    struct identity identity;
};

struct sha256_context {
    uint32_t state[8];
    uint64_t total_bytes;
    uint8_t block[64];
    size_t block_bytes;
};

static const uint32_t sha256_constants[64] = {
    UINT32_C(0x428a2f98), UINT32_C(0x71374491), UINT32_C(0xb5c0fbcf), UINT32_C(0xe9b5dba5),
    UINT32_C(0x3956c25b), UINT32_C(0x59f111f1), UINT32_C(0x923f82a4), UINT32_C(0xab1c5ed5),
    UINT32_C(0xd807aa98), UINT32_C(0x12835b01), UINT32_C(0x243185be), UINT32_C(0x550c7dc3),
    UINT32_C(0x72be5d74), UINT32_C(0x80deb1fe), UINT32_C(0x9bdc06a7), UINT32_C(0xc19bf174),
    UINT32_C(0xe49b69c1), UINT32_C(0xefbe4786), UINT32_C(0x0fc19dc6), UINT32_C(0x240ca1cc),
    UINT32_C(0x2de92c6f), UINT32_C(0x4a7484aa), UINT32_C(0x5cb0a9dc), UINT32_C(0x76f988da),
    UINT32_C(0x983e5152), UINT32_C(0xa831c66d), UINT32_C(0xb00327c8), UINT32_C(0xbf597fc7),
    UINT32_C(0xc6e00bf3), UINT32_C(0xd5a79147), UINT32_C(0x06ca6351), UINT32_C(0x14292967),
    UINT32_C(0x27b70a85), UINT32_C(0x2e1b2138), UINT32_C(0x4d2c6dfc), UINT32_C(0x53380d13),
    UINT32_C(0x650a7354), UINT32_C(0x766a0abb), UINT32_C(0x81c2c92e), UINT32_C(0x92722c85),
    UINT32_C(0xa2bfe8a1), UINT32_C(0xa81a664b), UINT32_C(0xc24b8b70), UINT32_C(0xc76c51a3),
    UINT32_C(0xd192e819), UINT32_C(0xd6990624), UINT32_C(0xf40e3585), UINT32_C(0x106aa070),
    UINT32_C(0x19a4c116), UINT32_C(0x1e376c08), UINT32_C(0x2748774c), UINT32_C(0x34b0bcb5),
    UINT32_C(0x391c0cb3), UINT32_C(0x4ed8aa4a), UINT32_C(0x5b9cca4f), UINT32_C(0x682e6ff3),
    UINT32_C(0x748f82ee), UINT32_C(0x78a5636f), UINT32_C(0x84c87814), UINT32_C(0x8cc70208),
    UINT32_C(0x90befffa), UINT32_C(0xa4506ceb), UINT32_C(0xbef9a3f7), UINT32_C(0xc67178f2)
};

static int error_message(int code, const char *message)
{
    (void)fprintf(stderr, "secure-receipt-writer: %s\n", message);
    return code;
}

static int error_errno(int code, const char *operation)
{
    int saved_errno = errno;
    (void)fprintf(stderr, "secure-receipt-writer: %s: %s\n", operation, strerror(saved_errno));
    return code;
}

static void print_usage(void)
{
    (void)fprintf(stderr,
        "usage: secure-receipt-writer --root ABS_PATH --root-dev DEC --root-ino DEC "
        "--segment SAFE [--segment SAFE ...] --final SAFE --input FILE "
        "--expected-input-sha HEX64\n");
}

static bool parse_decimal_uintmax(const char *text, uintmax_t *value)
{
    char *end = NULL;
    uintmax_t parsed;
    size_t index;

    if (text == NULL || text[0] == '\0') {
        return false;
    }
    for (index = 0; text[index] != '\0'; index++) {
        if (text[index] < '0' || text[index] > '9') {
            return false;
        }
    }
    errno = 0;
    parsed = strtoumax(text, &end, 10);
    if (errno == ERANGE || end == text || end == NULL || *end != '\0') {
        return false;
    }
    *value = parsed;
    return true;
}

static int hex_value(unsigned char byte)
{
    if (byte >= (unsigned char)'0' && byte <= (unsigned char)'9') {
        return (int)(byte - (unsigned char)'0');
    }
    if (byte >= (unsigned char)'a' && byte <= (unsigned char)'f') {
        return (int)(byte - (unsigned char)'a') + 10;
    }
    if (byte >= (unsigned char)'A' && byte <= (unsigned char)'F') {
        return (int)(byte - (unsigned char)'A') + 10;
    }
    return -1;
}

static bool parse_sha256(const char *text, uint8_t output[32], char canonical[65])
{
    static const char hex[] = "0123456789abcdef";
    size_t index;

    if (text == NULL || strlen(text) != 64U) {
        return false;
    }
    for (index = 0; index < 32U; index++) {
        int high = hex_value((unsigned char)text[index * 2U]);
        int low = hex_value((unsigned char)text[index * 2U + 1U]);

        if (high < 0 || low < 0) {
            return false;
        }
        output[index] = (uint8_t)(((unsigned int)high << 4U) | (unsigned int)low);
        canonical[index * 2U] = hex[(unsigned int)high];
        canonical[index * 2U + 1U] = hex[(unsigned int)low];
    }
    canonical[64] = '\0';
    return true;
}

static bool is_safe_segment(const char *segment)
{
    size_t length;
    size_t index;

    if (segment == NULL) {
        return false;
    }
    length = strlen(segment);
    if (length == 0U || length > MAX_SAFE_SEGMENT_BYTES) {
        return false;
    }
    if (strcmp(segment, ".") == 0 || strcmp(segment, "..") == 0) {
        return false;
    }
    for (index = 0; index < length; index++) {
        unsigned char byte = (unsigned char)segment[index];
        bool allowed = (byte >= (unsigned char)'A' && byte <= (unsigned char)'Z') ||
            (byte >= (unsigned char)'a' && byte <= (unsigned char)'z') ||
            (byte >= (unsigned char)'0' && byte <= (unsigned char)'9') ||
            byte == (unsigned char)'.' || byte == (unsigned char)'_' || byte == (unsigned char)'-';

        if (!allowed) {
            return false;
        }
    }
    return true;
}

static int parse_options(int argc, char **argv, struct options *options)
{
    int index;

    memset(options, 0, sizeof(*options));
    for (index = 1; index < argc; index++) {
        const char *name = argv[index];
        const char *value;

        if (index + 1 >= argc) {
            print_usage();
            return error_message(EXIT_USAGE_ERROR, "every option requires a value");
        }
        value = argv[++index];
        if (strcmp(name, "--root") == 0) {
            if (options->root != NULL) {
                return error_message(EXIT_USAGE_ERROR, "duplicate --root");
            }
            options->root = value;
        } else if (strcmp(name, "--root-dev") == 0) {
            if (options->have_root_dev) {
                return error_message(EXIT_USAGE_ERROR, "duplicate --root-dev");
            }
            if (!parse_decimal_uintmax(value, &options->root_dev)) {
                return error_message(EXIT_USAGE_ERROR, "--root-dev must be unsigned decimal");
            }
            options->have_root_dev = true;
        } else if (strcmp(name, "--root-ino") == 0) {
            if (options->have_root_ino) {
                return error_message(EXIT_USAGE_ERROR, "duplicate --root-ino");
            }
            if (!parse_decimal_uintmax(value, &options->root_ino)) {
                return error_message(EXIT_USAGE_ERROR, "--root-ino must be unsigned decimal");
            }
            options->have_root_ino = true;
        } else if (strcmp(name, "--segment") == 0) {
            if (options->segment_count >= MAX_SEGMENTS) {
                return error_message(EXIT_USAGE_ERROR, "too many --segment options");
            }
            if (!is_safe_segment(value)) {
                return error_message(EXIT_USAGE_ERROR, "unsafe --segment value");
            }
            options->segments[options->segment_count++] = value;
        } else if (strcmp(name, "--final") == 0) {
            if (options->final_name != NULL) {
                return error_message(EXIT_USAGE_ERROR, "duplicate --final");
            }
            if (!is_safe_segment(value)) {
                return error_message(EXIT_USAGE_ERROR, "unsafe --final value");
            }
            options->final_name = value;
        } else if (strcmp(name, "--input") == 0) {
            if (options->input != NULL) {
                return error_message(EXIT_USAGE_ERROR, "duplicate --input");
            }
            if (value[0] == '\0') {
                return error_message(EXIT_USAGE_ERROR, "--input must not be empty");
            }
            options->input = value;
        } else if (strcmp(name, "--expected-input-sha") == 0) {
            if (options->have_expected_sha256) {
                return error_message(EXIT_USAGE_ERROR, "duplicate --expected-input-sha");
            }
            if (!parse_sha256(value, options->expected_sha256, options->expected_sha256_hex)) {
                return error_message(EXIT_USAGE_ERROR, "--expected-input-sha must be 64 hexadecimal bytes");
            }
            options->have_expected_sha256 = true;
        } else {
            print_usage();
            return error_message(EXIT_USAGE_ERROR, "unknown option");
        }
    }

    if (options->root == NULL || !options->have_root_dev || !options->have_root_ino ||
        options->segment_count == 0U || options->final_name == NULL || options->input == NULL ||
        !options->have_expected_sha256) {
        print_usage();
        return error_message(EXIT_USAGE_ERROR, "missing required option");
    }
    return 0;
}

static uint32_t rotate_right(uint32_t value, unsigned int count)
{
    return (value >> count) | (value << (32U - count));
}

static void sha256_transform(struct sha256_context *context, const uint8_t block[64])
{
    uint32_t words[64];
    uint32_t a;
    uint32_t b;
    uint32_t c;
    uint32_t d;
    uint32_t e;
    uint32_t f;
    uint32_t g;
    uint32_t h;
    size_t index;

    for (index = 0; index < 16U; index++) {
        size_t offset = index * 4U;
        words[index] = ((uint32_t)block[offset] << 24U) |
            ((uint32_t)block[offset + 1U] << 16U) |
            ((uint32_t)block[offset + 2U] << 8U) |
            (uint32_t)block[offset + 3U];
    }
    for (index = 16U; index < 64U; index++) {
        uint32_t x = words[index - 15U];
        uint32_t y = words[index - 2U];
        uint32_t s0 = rotate_right(x, 7U) ^ rotate_right(x, 18U) ^ (x >> 3U);
        uint32_t s1 = rotate_right(y, 17U) ^ rotate_right(y, 19U) ^ (y >> 10U);
        words[index] = words[index - 16U] + s0 + words[index - 7U] + s1;
    }

    a = context->state[0];
    b = context->state[1];
    c = context->state[2];
    d = context->state[3];
    e = context->state[4];
    f = context->state[5];
    g = context->state[6];
    h = context->state[7];

    for (index = 0; index < 64U; index++) {
        uint32_t sum1 = rotate_right(e, 6U) ^ rotate_right(e, 11U) ^ rotate_right(e, 25U);
        uint32_t choose = (e & f) ^ ((~e) & g);
        uint32_t temporary1 = h + sum1 + choose + sha256_constants[index] + words[index];
        uint32_t sum0 = rotate_right(a, 2U) ^ rotate_right(a, 13U) ^ rotate_right(a, 22U);
        uint32_t majority = (a & b) ^ (a & c) ^ (b & c);
        uint32_t temporary2 = sum0 + majority;

        h = g;
        g = f;
        f = e;
        e = d + temporary1;
        d = c;
        c = b;
        b = a;
        a = temporary1 + temporary2;
    }

    context->state[0] += a;
    context->state[1] += b;
    context->state[2] += c;
    context->state[3] += d;
    context->state[4] += e;
    context->state[5] += f;
    context->state[6] += g;
    context->state[7] += h;
}

static void sha256_init(struct sha256_context *context)
{
    context->state[0] = UINT32_C(0x6a09e667);
    context->state[1] = UINT32_C(0xbb67ae85);
    context->state[2] = UINT32_C(0x3c6ef372);
    context->state[3] = UINT32_C(0xa54ff53a);
    context->state[4] = UINT32_C(0x510e527f);
    context->state[5] = UINT32_C(0x9b05688c);
    context->state[6] = UINT32_C(0x1f83d9ab);
    context->state[7] = UINT32_C(0x5be0cd19);
    context->total_bytes = 0U;
    context->block_bytes = 0U;
}

static bool sha256_update(struct sha256_context *context, const uint8_t *data, size_t length)
{
    size_t consumed = 0U;

    if ((uintmax_t)length > (uintmax_t)(UINT64_MAX - context->total_bytes)) {
        return false;
    }
    context->total_bytes += (uint64_t)length;
    while (consumed < length) {
        size_t available = 64U - context->block_bytes;
        size_t remaining = length - consumed;
        size_t take = remaining < available ? remaining : available;

        memcpy(context->block + context->block_bytes, data + consumed, take);
        context->block_bytes += take;
        consumed += take;
        if (context->block_bytes == 64U) {
            sha256_transform(context, context->block);
            context->block_bytes = 0U;
        }
    }
    return true;
}

static bool sha256_final(struct sha256_context *context, uint8_t digest[32])
{
    uint64_t bit_length;
    size_t index;

    if (context->total_bytes > UINT64_MAX / UINT64_C(8)) {
        return false;
    }
    bit_length = context->total_bytes * UINT64_C(8);
    context->block[context->block_bytes++] = UINT8_C(0x80);
    if (context->block_bytes > 56U) {
        while (context->block_bytes < 64U) {
            context->block[context->block_bytes++] = 0U;
        }
        sha256_transform(context, context->block);
        context->block_bytes = 0U;
    }
    while (context->block_bytes < 56U) {
        context->block[context->block_bytes++] = 0U;
    }
    for (index = 0U; index < 8U; index++) {
        unsigned int shift = (unsigned int)((7U - index) * 8U);
        context->block[56U + index] = (uint8_t)(bit_length >> shift);
    }
    sha256_transform(context, context->block);
    for (index = 0U; index < 8U; index++) {
        digest[index * 4U] = (uint8_t)(context->state[index] >> 24U);
        digest[index * 4U + 1U] = (uint8_t)(context->state[index] >> 16U);
        digest[index * 4U + 2U] = (uint8_t)(context->state[index] >> 8U);
        digest[index * 4U + 3U] = (uint8_t)context->state[index];
    }
    return true;
}

static bool same_identity(const struct stat *status, const struct identity *identity)
{
    return status->st_dev == identity->dev && status->st_ino == identity->ino;
}

static int validate_directory_status(const struct stat *status, const char *description)
{
    if (!S_ISDIR(status->st_mode)) {
        return error_message(EXIT_PUBLICATION_ERROR, description);
    }
    return 0;
}

static bool valid_root_component(const char *component, size_t length)
{
    size_t index;

    if (length == 0U || length > MAX_SAFE_SEGMENT_BYTES) {
        return false;
    }
    if ((length == 1U && component[0] == '.') ||
        (length == 2U && component[0] == '.' && component[1] == '.')) {
        return false;
    }
    for (index = 0; index < length; index++) {
        unsigned char byte = (unsigned char)component[index];
        if (byte < UINT8_C(0x20) || byte == UINT8_C(0x7f) || byte == (unsigned char)'\\') {
            return false;
        }
    }
    return true;
}

static int open_absolute_directory_no_symlinks(const char *path, struct stat *final_status)
{
    const char *cursor;
    int current_fd;
    bool saw_component = false;

    if (path == NULL || path[0] != '/' || path[1] == '\0') {
        (void)error_message(EXIT_USAGE_ERROR, "--root must be a non-root absolute path");
        return -1;
    }
    current_fd = open("/", O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    if (current_fd < 0) {
        (void)error_errno(EXIT_PUBLICATION_ERROR, "open filesystem root");
        return -1;
    }

    cursor = path + 1;
    while (*cursor != '\0') {
        const char *slash = strchr(cursor, '/');
        size_t length = slash == NULL ? strlen(cursor) : (size_t)(slash - cursor);
        char component[MAX_SAFE_SEGMENT_BYTES + 1];
        int next_fd;

        if (!valid_root_component(cursor, length)) {
            (void)error_message(EXIT_USAGE_ERROR, "--root contains an unsafe or non-canonical component");
            (void)close(current_fd);
            return -1;
        }
        memcpy(component, cursor, length);
        component[length] = '\0';
        next_fd = openat(current_fd, component, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
        if (next_fd < 0) {
            (void)error_errno(EXIT_PUBLICATION_ERROR, "open --root component without following symlinks");
            (void)close(current_fd);
            return -1;
        }
        (void)close(current_fd);
        current_fd = next_fd;
        saw_component = true;
        if (slash == NULL) {
            cursor += length;
        } else {
            cursor = slash + 1;
            if (*cursor == '\0') {
                (void)error_message(EXIT_USAGE_ERROR, "--root must not have a trailing slash");
                (void)close(current_fd);
                return -1;
            }
        }
    }

    if (!saw_component) {
        (void)error_message(EXIT_USAGE_ERROR, "--root must name a directory below /");
        (void)close(current_fd);
        return -1;
    }
    if (fstat(current_fd, final_status) < 0) {
        (void)error_errno(EXIT_PUBLICATION_ERROR, "fstat receipt root");
        (void)close(current_fd);
        return -1;
    }
    if (validate_directory_status(final_status, "receipt root is not a directory") != 0) {
        (void)close(current_fd);
        return -1;
    }
    return current_fd;
}

static int open_verified_root(const struct options *options, struct stat *status)
{
    int fd = open_absolute_directory_no_symlinks(options->root, status);

    if (fd < 0) {
        return -1;
    }
    if ((uintmax_t)status->st_dev != options->root_dev ||
        (uintmax_t)status->st_ino != options->root_ino) {
        (void)error_message(EXIT_PUBLICATION_ERROR, "receipt root device/inode does not match caller expectation");
        (void)close(fd);
        return -1;
    }
    return fd;
}

static int open_or_create_child_directory(int parent_fd, const char *segment, dev_t root_dev,
    struct directory_handle *child)
{
    int fd;
    bool created = false;
    struct stat created_status;
    struct stat status;

    fd = openat(parent_fd, segment, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    if (fd < 0 && errno == ENOENT) {
        if (mkdirat(parent_fd, segment, (mode_t)0700) == 0) {
            created = true;
            if (fstatat(parent_fd, segment, &created_status, AT_SYMLINK_NOFOLLOW) < 0) {
                (void)error_errno(EXIT_PUBLICATION_ERROR, "fstatat newly-created receipt directory");
                return EXIT_PUBLICATION_ERROR;
            }
            if (!S_ISDIR(created_status.st_mode)) {
                (void)error_message(EXIT_PUBLICATION_ERROR, "new receipt path segment is not a directory");
                return EXIT_PUBLICATION_ERROR;
            }
        } else if (errno != EEXIST) {
            (void)error_errno(EXIT_PUBLICATION_ERROR, "mkdirat receipt path segment");
            return EXIT_PUBLICATION_ERROR;
        }
        fd = openat(parent_fd, segment, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    }
    if (fd < 0) {
        (void)error_errno(EXIT_PUBLICATION_ERROR, "openat receipt path segment without following symlinks");
        return EXIT_PUBLICATION_ERROR;
    }
    if (fstat(fd, &status) < 0) {
        (void)error_errno(EXIT_PUBLICATION_ERROR, "fstat receipt path segment");
        (void)close(fd);
        return EXIT_PUBLICATION_ERROR;
    }
    if (validate_directory_status(&status, "receipt path segment is not a directory") != 0) {
        (void)close(fd);
        return EXIT_PUBLICATION_ERROR;
    }
    if (status.st_dev != root_dev) {
        (void)error_message(EXIT_PUBLICATION_ERROR, "receipt path segment crosses a device boundary");
        (void)close(fd);
        return EXIT_PUBLICATION_ERROR;
    }
    if (created && (status.st_dev != created_status.st_dev || status.st_ino != created_status.st_ino)) {
        (void)error_message(EXIT_PUBLICATION_ERROR, "new receipt path segment was replaced before open");
        (void)close(fd);
        return EXIT_PUBLICATION_ERROR;
    }
    if (created && fchmod(fd, (mode_t)0700) < 0) {
        (void)error_errno(EXIT_PUBLICATION_ERROR, "fchmod newly-created receipt directory");
        (void)close(fd);
        return EXIT_PUBLICATION_ERROR;
    }
    child->fd = fd;
    child->identity.dev = status.st_dev;
    child->identity.ino = status.st_ino;
    return 0;
}

static int verify_held_directories(const struct directory_handle *directories, size_t count)
{
    size_t index;

    for (index = 0; index < count; index++) {
        struct stat status;

        if (fstat(directories[index].fd, &status) < 0) {
            return error_errno(EXIT_PUBLICATION_ERROR, "fstat held receipt directory");
        }
        if (!S_ISDIR(status.st_mode) || !same_identity(&status, &directories[index].identity)) {
            return error_message(EXIT_PUBLICATION_ERROR, "held receipt directory identity changed");
        }
    }
    return 0;
}

static int verify_path_chain(const struct options *options,
    const struct directory_handle *directories, const struct identity *final_identity)
{
    struct stat status;
    int current_fd;
    size_t index;

    current_fd = open_verified_root(options, &status);
    if (current_fd < 0) {
        return EXIT_PUBLICATION_ERROR;
    }
    if (!same_identity(&status, &directories[0].identity)) {
        (void)close(current_fd);
        return error_message(EXIT_PUBLICATION_ERROR, "receipt root path identity changed");
    }

    for (index = 0; index < options->segment_count; index++) {
        int next_fd = openat(current_fd, options->segments[index],
            O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);

        if (next_fd < 0) {
            (void)error_errno(EXIT_PUBLICATION_ERROR, "rewalk receipt path segment");
            (void)close(current_fd);
            return EXIT_PUBLICATION_ERROR;
        }
        if (fstat(next_fd, &status) < 0) {
            (void)error_errno(EXIT_PUBLICATION_ERROR, "fstat rewalked receipt path segment");
            (void)close(next_fd);
            (void)close(current_fd);
            return EXIT_PUBLICATION_ERROR;
        }
        if (!S_ISDIR(status.st_mode) || !same_identity(&status, &directories[index + 1U].identity)) {
            (void)close(next_fd);
            (void)close(current_fd);
            return error_message(EXIT_PUBLICATION_ERROR, "receipt path segment identity changed");
        }
        (void)close(current_fd);
        current_fd = next_fd;
    }

    if (final_identity != NULL) {
        int final_fd = openat(current_fd, options->final_name, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);

        if (final_fd < 0) {
            (void)error_errno(EXIT_PUBLICATION_ERROR, "rewalk final receipt");
            (void)close(current_fd);
            return EXIT_PUBLICATION_ERROR;
        }
        if (fstat(final_fd, &status) < 0) {
            (void)error_errno(EXIT_PUBLICATION_ERROR, "fstat rewalked final receipt");
            (void)close(final_fd);
            (void)close(current_fd);
            return EXIT_PUBLICATION_ERROR;
        }
        if (!S_ISREG(status.st_mode) || status.st_nlink != (nlink_t)1 ||
            !same_identity(&status, final_identity)) {
            (void)close(final_fd);
            (void)close(current_fd);
            return error_message(EXIT_PUBLICATION_ERROR, "final receipt path identity or link count changed");
        }
        (void)close(final_fd);
    }
    (void)close(current_fd);
    return 0;
}

static int hash_fd_from_start(int fd, uint8_t digest[32], uint64_t *byte_count, const char *description)
{
    uint8_t buffer[COPY_BUFFER_BYTES];
    struct sha256_context context;

    if (lseek(fd, (off_t)0, SEEK_SET) < 0) {
        return error_errno(EXIT_IO_ERROR, description);
    }
    sha256_init(&context);
    for (;;) {
        ssize_t amount = read(fd, buffer, sizeof(buffer));

        if (amount < 0) {
            if (errno == EINTR) {
                continue;
            }
            return error_errno(EXIT_IO_ERROR, description);
        }
        if (amount == 0) {
            break;
        }
        if (!sha256_update(&context, buffer, (size_t)amount)) {
            return error_message(EXIT_DATA_ERROR, "input is too large for SHA-256 length encoding");
        }
    }
    if (!sha256_final(&context, digest)) {
        return error_message(EXIT_DATA_ERROR, "input is too large for SHA-256 length encoding");
    }
    *byte_count = context.total_bytes;
    return 0;
}

static int write_all(int fd, const uint8_t *buffer, size_t length)
{
    size_t written = 0U;

    while (written < length) {
        ssize_t amount = write(fd, buffer + written, length - written);

        if (amount < 0) {
            if (errno == EINTR) {
                continue;
            }
            return error_errno(EXIT_IO_ERROR, "write final receipt");
        }
        if (amount == 0) {
            return error_message(EXIT_IO_ERROR, "write final receipt made no progress");
        }
        written += (size_t)amount;
    }
    return 0;
}

static int copy_input_to_receipt(int input_fd, int receipt_fd, uint8_t digest[32], uint64_t *byte_count)
{
    uint8_t buffer[COPY_BUFFER_BYTES];
    struct sha256_context context;

    if (lseek(input_fd, (off_t)0, SEEK_SET) < 0) {
        return error_errno(EXIT_IO_ERROR, "rewind input before copy");
    }
    if (lseek(receipt_fd, (off_t)0, SEEK_SET) < 0) {
        return error_errno(EXIT_IO_ERROR, "rewind new receipt before copy");
    }
    sha256_init(&context);
    for (;;) {
        ssize_t amount = read(input_fd, buffer, sizeof(buffer));
        int result;

        if (amount < 0) {
            if (errno == EINTR) {
                continue;
            }
            return error_errno(EXIT_IO_ERROR, "read input during copy");
        }
        if (amount == 0) {
            break;
        }
        if (!sha256_update(&context, buffer, (size_t)amount)) {
            return error_message(EXIT_DATA_ERROR, "input is too large for SHA-256 length encoding");
        }
        result = write_all(receipt_fd, buffer, (size_t)amount);
        if (result != 0) {
            return result;
        }
    }
    if (!sha256_final(&context, digest)) {
        return error_message(EXIT_DATA_ERROR, "input is too large for SHA-256 length encoding");
    }
    *byte_count = context.total_bytes;
    return 0;
}

#ifdef SECURE_RECEIPT_WRITER_TESTING
static int run_test_pause(const char *stage)
{
    const char *pause_path = getenv("SECURE_RECEIPT_WRITER_TEST_PAUSE_FILE");
    const char *pause_stage = getenv("SECURE_RECEIPT_WRITER_TEST_PAUSE_STAGE");
    char *ready_path;
    size_t pause_length;
    int ready_fd;
    static const char ready_bytes[] = "ready\n";

    if (pause_path == NULL && pause_stage == NULL) {
        return 0;
    }
    if (pause_path == NULL || pause_stage == NULL || pause_path[0] == '\0') {
        return error_message(EXIT_USAGE_ERROR, "test pause requires both pause file and pause stage");
    }
    if (strcmp(pause_stage, "before-create") != 0 && strcmp(pause_stage, "after-create") != 0) {
        return error_message(EXIT_USAGE_ERROR, "invalid test pause stage");
    }
    if (strcmp(stage, pause_stage) != 0) {
        return 0;
    }
    pause_length = strlen(pause_path);
    if (pause_length > SIZE_MAX - sizeof(".ready")) {
        return error_message(EXIT_USAGE_ERROR, "test pause path is too long");
    }
    ready_path = malloc(pause_length + sizeof(".ready"));
    if (ready_path == NULL) {
        return error_errno(EXIT_IO_ERROR, "allocate test pause path");
    }
    memcpy(ready_path, pause_path, pause_length);
    memcpy(ready_path + pause_length, ".ready", sizeof(".ready"));
    ready_fd = open(ready_path, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, (mode_t)0600);
    if (ready_fd < 0) {
        free(ready_path);
        return error_errno(EXIT_IO_ERROR, "create test pause ready file");
    }
    if (write_all(ready_fd, (const uint8_t *)ready_bytes, sizeof(ready_bytes) - 1U) != 0 ||
        fsync(ready_fd) < 0 || close(ready_fd) < 0) {
        int saved_errno = errno;
        (void)unlink(ready_path);
        free(ready_path);
        errno = saved_errno;
        return error_errno(EXIT_IO_ERROR, "publish test pause ready file");
    }

    for (;;) {
        struct stat pause_status;
        struct timespec delay;

        if (lstat(pause_path, &pause_status) < 0) {
            if (errno == ENOENT) {
                break;
            }
            (void)unlink(ready_path);
            free(ready_path);
            return error_errno(EXIT_IO_ERROR, "observe test pause file");
        }
        delay.tv_sec = 0;
        delay.tv_nsec = 10000000L;
        while (nanosleep(&delay, &delay) < 0 && errno == EINTR) {
        }
    }
    if (unlink(ready_path) < 0) {
        free(ready_path);
        return error_errno(EXIT_IO_ERROR, "remove test pause ready file");
    }
    free(ready_path);
    return 0;
}
#else
static int run_test_pause(const char *stage)
{
    (void)stage;
    return 0;
}
#endif

static int sync_directories(const struct directory_handle *directories, size_t count)
{
    size_t index = count;

    while (index > 0U) {
        index--;
        if (fsync(directories[index].fd) < 0) {
            return error_errno(EXIT_IO_ERROR, "fsync receipt directory");
        }
    }
    return 0;
}

static int cleanup_owned_final(int parent_fd, const char *final_name,
    const struct identity *final_identity)
{
    struct stat named_status;

    if (fstatat(parent_fd, final_name, &named_status, AT_SYMLINK_NOFOLLOW) < 0) {
        if (errno == ENOENT) {
            return 0;
        }
        return error_errno(EXIT_IO_ERROR, "inspect failed publication during cleanup");
    }
    if (!same_identity(&named_status, final_identity)) {
        return error_message(EXIT_IO_ERROR, "cleanup refused to unlink a replacement final path");
    }
    if (unlinkat(parent_fd, final_name, 0) < 0) {
        return error_errno(EXIT_IO_ERROR, "unlink failed publication");
    }
    if (fsync(parent_fd) < 0) {
        return error_errno(EXIT_IO_ERROR, "fsync receipt parent after cleanup");
    }
    return 0;
}

static void close_directories(struct directory_handle *directories, size_t count)
{
    size_t index;

    for (index = 0; index < count; index++) {
        if (directories[index].fd >= 0) {
            (void)close(directories[index].fd);
            directories[index].fd = -1;
        }
    }
}

int main(int argc, char **argv)
{
    struct options options;
    struct directory_handle directories[MAX_SEGMENTS + 1];
    struct stat status;
    struct stat input_status;
    struct identity final_identity;
    uint8_t initial_digest[32];
    uint8_t copied_digest[32];
    uint8_t readback_digest[32];
    uint64_t initial_bytes = 0U;
    uint64_t copied_bytes = 0U;
    uint64_t readback_bytes = 0U;
    size_t directory_count = 0U;
    size_t index;
    int input_fd = -1;
    int receipt_fd = -1;
    int result;
    bool final_created = false;
    bool final_identity_known = false;

    for (index = 0; index < MAX_SEGMENTS + 1U; index++) {
        directories[index].fd = -1;
    }

    result = parse_options(argc, argv, &options);
    if (result != 0) {
        return result;
    }

    input_fd = open(options.input, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    if (input_fd < 0) {
        return error_errno(EXIT_IO_ERROR, "open input without following final symlink");
    }
    if (fstat(input_fd, &input_status) < 0) {
        result = error_errno(EXIT_IO_ERROR, "fstat input");
        goto cleanup;
    }
    if (!S_ISREG(input_status.st_mode)) {
        result = error_message(EXIT_DATA_ERROR, "input must be a regular file");
        goto cleanup;
    }
    result = hash_fd_from_start(input_fd, initial_digest, &initial_bytes, "read input for preflight hash");
    if (result != 0) {
        goto cleanup;
    }
    if (memcmp(initial_digest, options.expected_sha256, sizeof(initial_digest)) != 0) {
        result = error_message(EXIT_DATA_ERROR, "input SHA-256 does not match --expected-input-sha");
        goto cleanup;
    }

    directories[0].fd = open_verified_root(&options, &status);
    if (directories[0].fd < 0) {
        result = EXIT_PUBLICATION_ERROR;
        goto cleanup;
    }
    directories[0].identity.dev = status.st_dev;
    directories[0].identity.ino = status.st_ino;
    directory_count = 1U;

    for (index = 0; index < options.segment_count; index++) {
        result = open_or_create_child_directory(directories[directory_count - 1U].fd,
            options.segments[index], directories[0].identity.dev, &directories[directory_count]);
        if (result != 0) {
            goto cleanup;
        }
        directory_count++;
    }

    result = verify_held_directories(directories, directory_count);
    if (result != 0) {
        goto cleanup;
    }
    result = verify_path_chain(&options, directories, NULL);
    if (result != 0) {
        goto cleanup;
    }
    result = run_test_pause("before-create");
    if (result != 0) {
        goto cleanup;
    }

    receipt_fd = openat(directories[directory_count - 1U].fd, options.final_name,
        O_RDWR | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, (mode_t)0600);
    if (receipt_fd < 0) {
        result = error_errno(EXIT_PUBLICATION_ERROR, "create final receipt exclusively");
        goto cleanup;
    }
    final_created = true;
    if (fstat(receipt_fd, &status) < 0) {
        result = error_errno(EXIT_PUBLICATION_ERROR, "fstat new final receipt");
        goto cleanup;
    }
    final_identity.dev = status.st_dev;
    final_identity.ino = status.st_ino;
    final_identity_known = true;
    if (!S_ISREG(status.st_mode) || status.st_nlink != (nlink_t)1 || status.st_size != (off_t)0) {
        result = error_message(EXIT_PUBLICATION_ERROR, "new final receipt has unsafe initial metadata");
        goto cleanup;
    }
    if (fchmod(receipt_fd, (mode_t)0600) < 0) {
        result = error_errno(EXIT_PUBLICATION_ERROR, "fchmod new final receipt");
        goto cleanup;
    }
    result = run_test_pause("after-create");
    if (result != 0) {
        goto cleanup;
    }
    if (fstat(receipt_fd, &status) < 0) {
        result = error_errno(EXIT_PUBLICATION_ERROR, "fstat final receipt before write");
        goto cleanup;
    }
    if (!same_identity(&status, &final_identity) || status.st_nlink != (nlink_t)1) {
        result = error_message(EXIT_PUBLICATION_ERROR, "final receipt acquired a hardlink before write");
        goto cleanup;
    }

    result = copy_input_to_receipt(input_fd, receipt_fd, copied_digest, &copied_bytes);
    if (result != 0) {
        goto cleanup;
    }
    if (copied_bytes != initial_bytes ||
        memcmp(copied_digest, options.expected_sha256, sizeof(copied_digest)) != 0) {
        result = error_message(EXIT_DATA_ERROR, "input changed between preflight hash and publication");
        goto cleanup;
    }
    if (fsync(receipt_fd) < 0) {
        result = error_errno(EXIT_IO_ERROR, "fsync final receipt");
        goto cleanup;
    }

    result = hash_fd_from_start(receipt_fd, readback_digest, &readback_bytes,
        "read back final receipt through publication descriptor");
    if (result != 0) {
        goto cleanup;
    }
    if (readback_bytes != copied_bytes ||
        memcmp(readback_digest, options.expected_sha256, sizeof(readback_digest)) != 0) {
        result = error_message(EXIT_DATA_ERROR, "same-descriptor receipt readback mismatch");
        goto cleanup;
    }
    if (fstat(receipt_fd, &status) < 0) {
        result = error_errno(EXIT_PUBLICATION_ERROR, "fstat final receipt after readback");
        goto cleanup;
    }
    if (!S_ISREG(status.st_mode) || !same_identity(&status, &final_identity) ||
        status.st_nlink != (nlink_t)1 || status.st_size < (off_t)0 ||
        (uintmax_t)status.st_size != (uintmax_t)readback_bytes) {
        result = error_message(EXIT_PUBLICATION_ERROR, "final receipt metadata changed during publication");
        goto cleanup;
    }

    result = verify_held_directories(directories, directory_count);
    if (result != 0) {
        goto cleanup;
    }
    result = verify_path_chain(&options, directories, &final_identity);
    if (result != 0) {
        goto cleanup;
    }
    result = sync_directories(directories, directory_count);
    if (result != 0) {
        goto cleanup;
    }
    result = verify_held_directories(directories, directory_count);
    if (result != 0) {
        goto cleanup;
    }
    result = verify_path_chain(&options, directories, &final_identity);
    if (result != 0) {
        goto cleanup;
    }

    (void)printf("OK sha256=%s bytes=%" PRIu64 "\n", options.expected_sha256_hex, readback_bytes);
    result = 0;

cleanup:
    if (result != 0 && final_created && final_identity_known) {
        int cleanup_result = cleanup_owned_final(directories[directory_count - 1U].fd,
            options.final_name, &final_identity);
        if (cleanup_result != 0) {
            result = cleanup_result;
        }
    }
    if (receipt_fd >= 0) {
        (void)close(receipt_fd);
    }
    if (input_fd >= 0) {
        (void)close(input_fd);
    }
    close_directories(directories, directory_count);
    return result;
}
